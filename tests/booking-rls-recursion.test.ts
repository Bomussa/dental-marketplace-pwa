import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260826193000_booking_patient_rls_recursion_fix_v1.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const bookingsPolicySql = migrationSql.split("drop policy if exists bookings_select on public.bookings;")[1] ?? "";

describe("booking RLS recursion regression", () => {
  it("keeps the archived self-patient guard in a private definer helper", () => {
    expect(migrationSql).toContain("create or replace function private.has_active_self_patient_profile");
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("revoke all on function private.has_active_self_patient_profile(uuid) from public, anon, authenticated;");
    expect(migrationSql).toContain("grant execute on function private.has_active_self_patient_profile(uuid) to authenticated;");
  });

  it("does not make bookings_select query patient_profiles under caller RLS", () => {
    expect(bookingsPolicySql).toContain("private.has_active_self_patient_profile((select auth.uid()))");
    expect(bookingsPolicySql).not.toContain("from public.patient_profiles");
    expect(bookingsPolicySql).toContain("private.has_branch_access(bookings.branch_id, null::text[])");
    expect(bookingsPolicySql).toContain("private.is_platform_admin()");
  });
});
