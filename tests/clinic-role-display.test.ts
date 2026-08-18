import { describe, expect, it } from "vitest";
import { effectiveClinicRole } from "@/lib/clinic-role-display";

describe("effectiveClinicRole", () => {
  const clinicId = "11111111-1111-4111-8111-111111111111";

  it("returns the highest effective role instead of the first database row", () => {
    expect(effectiveClinicRole([
      { clinic_id: clinicId, role: "viewer" },
      { clinic_id: clinicId, role: "manager" },
    ], clinicId)).toBe("manager");
  });

  it("keeps the role scoped to the selected clinic and ignores unsupported rows", () => {
    expect(effectiveClinicRole([
      { clinic_id: "22222222-2222-4222-8222-222222222222", role: "owner" },
      { clinic_id: clinicId, role: "unexpected_role" },
      { clinic_id: clinicId, role: "receptionist" },
    ], clinicId)).toBe("receptionist");
  });

  it("uses member when the selected clinic has no recognized membership", () => {
    expect(effectiveClinicRole([], clinicId)).toBe("member");
  });
});
