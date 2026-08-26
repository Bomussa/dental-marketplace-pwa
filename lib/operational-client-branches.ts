export type OperationalClientBranch = {
  id: string;
  clinic_id: string;
  status: string;
};

/**
 * A bookings-only operational client must always be provisioned for one active
 * branch belonging to the clinic selected by the super administrator.
 */
export function activeOperationalClientBranchesForClinic<T extends OperationalClientBranch>(
  branches: readonly T[],
  clinicId: string,
): T[] {
  if (!clinicId) return [];
  return branches.filter((branch) => branch.clinic_id === clinicId && branch.status === "active");
}
