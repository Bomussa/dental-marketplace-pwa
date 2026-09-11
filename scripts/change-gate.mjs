import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const failures = [];
const warnings = [];
const repoRoot = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sql"]);
const ignoredDirs = new Set([".git", ".next", "node_modules", "coverage", "playwright-report", "test-results"]);

function runGit(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function gitSafe(args) {
  try {
    return runGit(args);
  } catch {
    return "";
  }
}

function normalizeText(value) {
  return value
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) out.push(full);
  }
  return out;
}

function rel(file) {
  return relative(repoRoot, file).replaceAll("\\", "/");
}

const base = process.env.CHANGE_GATE_BASE_SHA || gitSafe(["rev-parse", "HEAD^"]);
if (!base) {
  failures.push("CHANGE_GATE_BASE_SHA is required in CI when a base commit cannot be resolved.");
  console.error(failures.join("\n"));
  process.exit(1);
}

let changed;
try {
  changed = runGit(["diff", "--name-status", `${base}...HEAD`])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, ...parts] = line.split("\t");
      return { status, path: parts.at(-1) };
    });
} catch (error) {
  failures.push(`Unable to inspect change set against ${base}: ${error.message}`);
  changed = [];
}

const changedPaths = changed.map((item) => item.path).filter(Boolean);
const addedSourcePaths = changed
  .filter((item) => item.status === "A" && sourceExtensions.has(item.path.slice(item.path.lastIndexOf("."))))
  .map((item) => item.path);

// 1. Whitespace/error gate.
const diffCheck = gitSafe(["diff", "--check", `${base}...HEAD`]);
if (diffCheck) failures.push(`git diff --check failed:\n${diffCheck}`);

// 2. Exact duplicate source-file gate. Two byte-for-byte identical source files are
// treated as a blocking duplicate because they create two sources of truth.
const files = walk(repoRoot);
const byHash = new Map();
for (const file of files) {
  const content = readFileSync(file);
  const hash = createHash("sha256").update(content).digest("hex");
  const path = rel(file);
  const list = byHash.get(hash) || [];
  list.push(path);
  byHash.set(hash, list);
}
for (const [hash, paths] of byHash) {
  if (paths.length < 2) continue;
  const sourceOnly = paths.filter((path) => sourceExtensions.has(path.slice(path.lastIndexOf("."))));
  if (sourceOnly.length > 1) {
    failures.push(`Exact duplicate source files detected (${hash.slice(0, 12)}): ${sourceOnly.join(", ")}`);
  }
}

// 3. A newly added source file may not be a normalized copy of an existing source file.
for (const path of addedSourcePaths) {
  const full = join(repoRoot, path);
  if (!existsSync(full)) continue;
  const normalized = normalizeText(readFileSync(full, "utf8"));
  if (!normalized) continue;
  for (const candidate of files) {
    const candidatePath = rel(candidate);
    if (candidatePath === path) continue;
    const candidateNormalized = normalizeText(readFileSync(candidate, "utf8"));
    if (normalized === candidateNormalized) {
      failures.push(`New source file is a duplicate of existing source: ${path} == ${candidatePath}`);
    }
  }
}

// 4. Export-name similarity is informational only. Identical export names are valid across
// modules and therefore cannot be treated as duplicates without semantic/AST analysis.
const exportPattern = /^\s*export\s+(?:async\s+)?(?:function|const|let|class|type|interface)\s+([A-Za-z_$][\w$]*)/gm;
const exportsByName = new Map();
for (const file of files) {
  const path = rel(file);
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(exportPattern)) {
    const name = match[1];
    const list = exportsByName.get(name) || [];
    list.push(path);
    exportsByName.set(name, list);
  }
}
const repeatedExportNames = [...exportsByName.entries()].filter(([, paths]) => paths.length > 1);
if (repeatedExportNames.length) {
  warnings.push(`Repeated export names exist across modules; semantic review is required for changed modules (${repeatedExportNames.length} repeated names observed).`);
}

// 5. High-risk boundary awareness. These changes remain valid, but they require deliberate
// security/architecture review rather than automatic consolidation.
const sensitivePatterns = [
  /supabase\/migrations\//,
  /app\/api\/.*\/route\.(?:ts|tsx|js|jsx)$/,
  /lib\/supabase\//,
  /(?:rls|policy|grant|revoke|book_slot|idempotenc|service_role|secret)/i,
];
const sensitiveChanges = changedPaths.filter((path) => sensitivePatterns.some((pattern) => pattern.test(path)));
if (sensitiveChanges.length) {
  warnings.push(`Sensitive boundary changed; mandatory human/security review remains required: ${sensitiveChanges.join(", ")}`);
}

console.log("CHANGE GATE");
console.log(`Base: ${base}`);
console.log(`Changed files: ${changedPaths.length}`);
console.log(`New source files: ${addedSourcePaths.length}`);
if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (failures.length) {
  console.error("\nCHANGE GATE FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CHANGE GATE PASSED: no exact source duplication or blocking change-set conflict detected.");
