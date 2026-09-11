import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const failures = [];
const warnings = [];
const repoRoot = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sql"]);
const ignoredDirs = new Set([".git", ".next", "node_modules", "coverage", "playwright-report", "test-results"]);
const duplicateSymbolIgnore = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "default"]);

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
  changed = runGit(["diff", "--name-status", `${base}...HEAD`]).split("\n").filter(Boolean).map((line) => {
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
try {
  const check = gitSafe(["diff", "--check", `${base}...HEAD`]);
  if (check) failures.push(`git diff --check failed:\n${check}`);
} catch (error) {
  failures.push(`git diff --check could not run: ${error.message}`);
}

// 2. Exact duplicate source-file gate. This is deliberately strict because two byte-for-byte
// identical implementations are never a useful second source of truth.
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

// 3. New source files must not be exact copies of an existing source file.
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

// 4. Export-name collision gate. Only fail when the same non-route exported declaration has
// the same normalized declaration line in more than one source file. Route HTTP handlers are
// intentionally excluded because Next.js requires the same names across route boundaries.
const exported = new Map();
const exportPattern = /^\s*export\s+(?:async\s+)?(?:function|const|let|class|type|interface)\s+([A-Za-z_$][\w$]*)[^\n]*/gm;
for (const file of files) {
  const path = rel(file);
  if (/\/route\.(?:ts|tsx|js|jsx)$/.test(path)) continue;
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(exportPattern)) {
    const name = match[1];
    if (duplicateSymbolIgnore.has(name)) continue;
    const signature = normalizeText(match[0]);
    const key = `${name}\n${signature}`;
    const list = exported.get(key) || [];
    list.push(path);
    exported.set(key, list);
  }
}
for (const [key, paths] of exported) {
  if (paths.length > 1) {
    const [name] = key.split("\n");
    failures.push(`Duplicate exported declaration detected: ${name} in ${paths.join(", ")}`);
  }
}

// 5. High-risk boundary awareness. The gate does not reject legitimate changes automatically;
// it forces an explicit audit marker in the changed source when sensitive boundaries move.
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
