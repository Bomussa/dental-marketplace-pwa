import { describe, expect, it } from "vitest";
import { activeOperationalClientBranchesForClinic } from "@/lib/operational-client-branches";

describe("operational client branch selection", () => {
  const branches = [
    { id: "a-active", clinic_id: "clinic-a", status: "active" },
    { id: "a-pending", clinic_id: "clinic-a", status: "pending" },
    { id: "b-active", clinic_id: "clinic-b", status: "active" },
  ] as const;

  it("returns only active branches belonging to the selected clinic", () => {
    expect(activeOperationalClientBranchesForClinic(branches, "clinic-a")).toEqual([
      { id: "a-active", clinic_id: "clinic-a", status: "active" },
    ]);
    expect(activeOperationalClientBranchesForClinic(branches, "clinic-b")).toEqual([
      { id: "b-active", clinic_id: "clinic-b", status: "active" },
    ]);
  });

  it("returns no branches until a clinic is selected", () => {
    expect(activeOperationalClientBranchesForClinic(branches, "")).toEqual([]);
    expect(activeOperationalClientBranchesForClinic(branches, "clinic-missing")).toEqual([]);
  });
});
