import { randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const environmentFile = new URL("../.env.local", import.meta.url);
const reportFile = new URL("../.tmp-role-simulation.json", import.meta.url);
const clinicId = process.env.QA_CLINIC_ID ?? "10000000-0000-4000-8000-000000000001";
const branchId = process.env.QA_BRANCH_ID ?? "20000000-0000-4000-8000-000000000001";
const action = process.argv[2] ?? "provision";

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return [];
    const [, key, raw] = match;
    const value = raw.replace(/^(['"])(.*)\1$/, "$2");
    return [[key, value]];
  }));
}

const env = parseEnv(await readFile(environmentFile, "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("QA_ROLE_SIMULATION_REQUIRES_SUPABASE_SERVICE_KEY");

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

if (action === "cleanup") {
  const report = JSON.parse(await readFile(reportFile, "utf8"));
  const ids = Object.values(report.users).map((user) => user.id);
  const { error: membershipError } = await admin.from("clinic_memberships").delete().in("user_id", ids);
  if (membershipError) throw membershipError;
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id, true);
    if (error) throw error;
  }
  console.log(JSON.stringify({ cleaned: ids.length }, null, 2));
  process.exit(0);
}

if (action !== "provision") throw new Error("Use `provision` or `cleanup`.");

const nonce = randomUUID().slice(0, 8);
const password = `Qa-${randomBytes(18).toString("base64url")}-9!`;
const definitions = [
  { key: "patient", label: "patient", appMetadata: {}, membership: null },
  { key: "clinicViewer", label: "clinic-viewer", appMetadata: {}, membership: { role: "viewer" } },
  { key: "clinicReception", label: "clinic-reception", appMetadata: {}, membership: { role: "receptionist" } },
  { key: "platformAdmin", label: "platform-admin", appMetadata: { platform_admin: true }, membership: null },
];

const users = {};
try {
  for (const definition of definitions) {
    const email = `qa-${definition.label}-${nonce}@test.mmc-mms.invalid`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: definition.appMetadata,
      user_metadata: { qa_role_simulation: true },
    });
    if (error || !data.user) throw error ?? new Error("QA_USER_CREATION_FAILED");
    users[definition.key] = { id: data.user.id, email, label: definition.label };
    if (definition.membership) {
      const { error: membershipError } = await admin.from("clinic_memberships").insert({
        user_id: data.user.id,
        clinic_id: clinicId,
        branch_id: branchId,
        role: definition.membership.role,
        status: "active",
      });
      if (membershipError) throw membershipError;
    }
  }
  const report = { createdAt: new Date().toISOString(), password, clinicId, branchId, users };
  await writeFile(reportFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    reportFile: ".tmp-role-simulation.json",
    clinicId,
    branchId,
    users: Object.fromEntries(Object.entries(users).map(([key, value]) => [key, { email: value.email, id: value.id }])),
  }, null, 2));
} catch (error) {
  const ids = Object.values(users).map((user) => user.id);
  if (ids.length) {
    await admin.from("clinic_memberships").delete().in("user_id", ids);
    await Promise.all(ids.map((id) => admin.auth.admin.deleteUser(id, true)));
  }
  throw error;
}
