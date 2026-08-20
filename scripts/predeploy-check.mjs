import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const failures = [];
const requiredFiles = [
  "package.json",
  "next.config.ts",
  "vercel.json",
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "app/auth/confirm/page.tsx",
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
for (const script of ["build", "typecheck", "lint", "test", "test:e2e"]) {
  if (!pkg.scripts?.[script]) failures.push(`Missing npm script: ${script}`);
}

const envExample = readFileSync(".env.example", "utf8");
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
]) {
  if (!envExample.includes(key)) failures.push(`.env.example is missing ${key}`);
}

const secretPattern = [
  "sb_secret_[A-Za-z0-9_-]{16,}",
  "eyJ[A-Za-z0-9_-]{80,}\\.[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}",
  "-----BEGIN (RSA|OPENSSH|EC) PRIVATE KEY-----",
  "sk-(proj-)?[A-Za-z0-9_-]{20,}",
  "(^|[[:space:]])(OPENAI_API_KEY|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|TWILIO_API_KEY|TWILIO_API_SECRET)[[:space:]]*=[[:space:]]*[^[:space:]#]{16,}",
].join("|");

let isGitWorkTree = false;
try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
  isGitWorkTree = true;
} catch {
  // Direct Vercel source deployments are intentionally unpacked without .git.
}

try {
  const secrets = isGitWorkTree
    ? execFileSync("git", ["grep", "-nE", secretPattern, "--", "."], { encoding: "utf8" })
    : execFileSync("grep", [
        "-R", "-n", "-E",
        "--exclude-dir=node_modules",
        "--exclude-dir=.next",
        "--exclude-dir=.git",
        "-e", secretPattern,
        ".",
      ], { encoding: "utf8" });
  const actionableSecrets = secrets
    .split("\n")
    .filter((line) => !line.includes("REPLACE_ME"))
    .join("\n")
    .trim();
  if (actionableSecrets) failures.push(`Potential secret material detected:\n${actionableSecrets}`);
} catch (error) {
  // Both git grep and grep exit 1 when they find no match, which is the expected secure state.
  if (error?.status !== 1) failures.push(`Secret scan failed unexpectedly: ${error.message}`);
}

if (failures.length) {
  console.error("Predeploy check FAILED:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Predeploy static check passed.");
