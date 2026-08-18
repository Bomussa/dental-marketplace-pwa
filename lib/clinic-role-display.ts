export type ClinicMembershipRole = "owner" | "manager" | "pricing_manager" | "receptionist" | "viewer";

type ClinicMembershipLike = {
  clinic_id: string;
  role: string;
};

const rolePriority: Record<ClinicMembershipRole, number> = {
  owner: 5,
  manager: 4,
  pricing_manager: 3,
  receptionist: 2,
  viewer: 1,
};

/**
 * Returns the highest effective role for the selected clinic.
 * A user can have more than one active membership, so relying on the first
 * database row would produce a misleading badge and depends on row ordering.
 */
export function effectiveClinicRole(memberships: ClinicMembershipLike[], clinicId: string): ClinicMembershipRole | "member" {
  let effectiveRole: ClinicMembershipRole | null = null;

  for (const membership of memberships) {
    if (membership.clinic_id !== clinicId || !(membership.role in rolePriority)) continue;
    const role = membership.role as ClinicMembershipRole;
    if (!effectiveRole || rolePriority[role] > rolePriority[effectiveRole]) effectiveRole = role;
  }

  return effectiveRole ?? "member";
}
