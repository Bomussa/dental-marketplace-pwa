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
].join("|");

try {
  const secrets = execFileSync("git", ["grep", "-nE", secretPattern, "--", "."], { encoding: "utf8" });
  if (secrets.trim()) failures.push(`Potential secret material detected:\n${secrets.trim()}`);
} catch (error) {
  // git grep exits 1 when it has no match, which is the expected secure state.
  if (error?.status !== 1) failures.push(`Secret scan failed unexpectedly: ${error.message}`);
}

if (failures.length) {
  console.error("Predeploy check FAILED:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Predeploy static check passed.");
