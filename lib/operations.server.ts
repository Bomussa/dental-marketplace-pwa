import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifiedActor() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const actorId = data?.claims?.sub;

  if (error || typeof actorId !== "string") {
    throw new Error("AUTH_REQUIRED");
  }

  return actorId;
}

async function callOperationalRpc<T extends keyof import("@/lib/database.types").Database["public"]["Functions"]>(
  functionName: T,
  args: import("@/lib/database.types").Database["public"]["Functions"][T]["Args"],
) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(functionName, args);
  if (error) throw new Error(error.code || "OPERATION_FAILED");
  return data;
}

export async function requestOfferRevision(input: {
  offerId: string;
  priceType: "fixed" | "from" | "range" | "package" | "consultation_required";
  minMinor: number | null;
  maxMinor: number | null;
  durationMinutes: number;
  reason: string;
}) {
  const actorId = await verifiedActor();
  // The generated Supabase type marks nullable PostgreSQL function parameters as required numbers.
  // Keep the runtime contract faithful to the RPC: null is meaningful for consultation, fixed, from, and package prices.
  const args = {
    p_actor_id: actorId,
    p_offer_id: input.offerId,
    p_price_type: input.priceType,
    p_min_minor: input.minMinor,
    p_max_minor: input.maxMinor,
    p_duration_minutes: input.durationMinutes,
    p_reason: input.reason,
  };
  return callOperationalRpc("request_offer_revision_server", args as never);
}

export async function reviewOfferRevision(input: { revisionId: string; approve: boolean; reason?: string }) {
  const actorId = await verifiedActor();
  return callOperationalRpc("review_offer_revision_server", {
    p_actor_id: actorId,
    p_revision_id: input.revisionId,
    p_approve: input.approve,
    p_reason: input.reason,
  });
}

export async function checkInBooking(input: { bookingId: string; reason?: string }) {
  const actorId = await verifiedActor();
  return callOperationalRpc("record_booking_check_in_server", {
    p_actor_id: actorId,
    p_booking_id: input.bookingId,
    p_reason: input.reason,
  });
}

export async function reverseAttendance(input: { bookingId: string; reason: string }) {
  const actorId = await verifiedActor();
  return callOperationalRpc("reverse_booking_attendance_server", {
    p_actor_id: actorId,
    p_booking_id: input.bookingId,
    p_reason: input.reason,
  });
}

export async function createSettlementPeriod(input: {
  clinicId: string;
  periodStart: string;
  periodEnd: string;
  periodKind: "weekly" | "monthly" | "annual" | "manual";
  notes?: string;
}) {
  const actorId = await verifiedActor();
  return callOperationalRpc("create_settlement_period_server", {
    p_actor_id: actorId,
    p_clinic_id: input.clinicId,
    p_period_start: input.periodStart,
    p_period_end: input.periodEnd,
    p_period_kind: input.periodKind,
    p_notes: input.notes,
  });
}

export async function financialReportSummary(input: { clinicId: string; periodStart: string; periodEnd: string }) {
  const actorId = await verifiedActor();
  return callOperationalRpc("financial_report_summary_server", {
    p_actor_id: actorId,
    p_clinic_id: input.clinicId,
    p_start: input.periodStart,
    p_end: input.periodEnd,
  });
}
