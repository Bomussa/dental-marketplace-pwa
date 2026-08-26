import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260826230000_consolidate_patient_profiles_select_policy_v1.sql");
const migration = readFileSync(migrationPath, "utf8");

describe("patient profile read-policy consolidation", () => {
  it("removes the overlapping self policy before recreating one archived-aware authenticated policy", () => {
    expect(migration).toContain("drop policy if exists patient_profiles_select_own on public.patient_profiles;");
    expect(migration).toContain("drop policy if exists patient_profiles_authenticated_select on public.patient_profiles;");
    expect(migration.match(/create policy patient_profiles_authenticated_select/g)).toHaveLength(1);
    expect(migration).toContain("account_id = (select auth.uid())");
    expect(migration).toContain("and archived_at is null");
  });

  it("retains authorised operational branch access without adding a public or anonymous grant", () => {
    expect(migration).toContain("private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist'])");
    expect(migration).not.toMatch(/\bto\s+(?:anon|public)\b/i);
    expect(migration).not.toMatch(/grant\s+(?:all|select)/i);
  });
});
