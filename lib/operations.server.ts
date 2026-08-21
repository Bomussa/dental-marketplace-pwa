import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const OPERATIONAL_RPC_TIMEOUT_MS = 15_000;
const DEVICE_INSTALLATION_UNAUTHORIZED_RETRY_DELAY_MS = 100;

export function withOperationalTimeout<T>(operation: PromiseLike<T>, timeoutMs = OPERATIONAL_RPC_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("OPERATION_TIMEOUT")), timeoutMs);
    void operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function verifiedActor() {
  const supabase = await createClient();
  const { data, error } = await withOperationalTimeout(supabase.auth.getClaims());
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
  const { data, error } = await admin.rpc(functionName, args).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
  if (error) throw new Error(error.code || "OPERATION_FAILED");
  return data;
}

type ServerRpcResult = {
  data: unknown;
  error: { code?: string } | null;
  status: number;
};

type ServerRpcRequest = PromiseLike<ServerRpcResult> & {
  abortSignal(signal: AbortSignal): ServerRpcRequest;
};

type ServerRpc = (functionName: string, args: Record<string, unknown>) => ServerRpcRequest;

async function serverRpcResult(functionName: string, args: Record<string, unknown>) {
  const admin = createAdminClient();
  // Keep newly-added server-only RPCs usable immediately after a migration even
  // before the checked-in generated Database type file is refreshed.
  const rpc = admin.rpc.bind(admin) as unknown as ServerRpc;
  return rpc(functionName, args).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
}

async function callServerRpc(functionName: string, args: Record<string, unknown>) {
  const { data, error } = await serverRpcResult(functionName, args);
  if (error) throw new Error(error.code || "OPERATION_FAILED");
  return data;
}

async function callServerRpcWithSingleUnauthorizedRetry(functionName: string, args: Record<string, unknown>) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await serverRpcResult(functionName, args);
    if (!result.error) return result.data;

    // A 401 is rejected before the RPC reaches Postgres. Retrying it once with a
    // fresh admin client is therefore safe for this idempotent registration path
    // and specifically covers the transient gateway rejection observed in production.
    if (result.status === 401 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, DEVICE_INSTALLATION_UNAUTHORIZED_RETRY_DELAY_MS));
      continue;
    }

    throw new Error(result.error.code || `HTTP_${result.status}`);
  }

  throw new Error("OPERATION_FAILED");
}

function rateLimitSubjectKey(scope: string, subject: string) {
  const normalized = subject.trim();
  if (!normalized) throw new Error("RATE_LIMIT_SUBJECT_INVALID");
  return createHash("sha256").update(`${scope}:${normalized}`).digest("hex");
}

export async function consumeRateLimit(input: {
  scope: "booking" | "device_installation" | "support_message" | "choice_event" | "phone_verification_start" | "phone_verification_confirm" | "patient_booking_registration" | "patient_profile_create" | "login";
  subject: string;
  maxRequests: number;
  windowSeconds: number;
}) {
  const subjectKey = rateLimitSubjectKey(input.scope, input.subject);
  const allowed = await callOperationalRpc("consume_rate_limit_server", {
    p_scope: input.scope,
    p_subject_key: subjectKey,
    p_limit: input.maxRequests,
    p_window_seconds: input.windowSeconds,
  });
  return allowed === true;
}

export async function registerDeviceInstallation(input: {
  accountId: string | null;
  installationId: string;
  deviceLabel?: string;
  platform?: string;
  browser?: string;
  deviceClass: "mobile" | "tablet" | "desktop" | "unknown";
  appVersion?: string;
}) {
  return callServerRpc("register_device_installation_server", {
    p_account_id: input.accountId,
    p_installation_id: input.installationId,
    p_device_label: input.deviceLabel ?? null,
    p_platform: input.platform ?? null,
    p_browser: input.browser ?? null,
    p_device_class: input.deviceClass,
    p_app_version: input.appVersion ?? null,
  });
}

export type DeviceInstallationRegistrationResult = "ok" | "client_rate_limited" | "installation_rate_limited";

export async function registerDeviceInstallationGuarded(input: {
  accountId: string | null;
  installationId: string;
  clientSubject: string;
  deviceLabel?: string;
  platform?: string;
  browser?: string;
  deviceClass: "mobile" | "tablet" | "desktop" | "unknown";
  appVersion?: string;
}): Promise<DeviceInstallationRegistrationResult> {
  const result = await callServerRpcWithSingleUnauthorizedRetry("register_device_installation_guarded_server", {
    p_account_id: input.accountId,
    p_installation_id: input.installationId,
    p_device_label: input.deviceLabel ?? null,
    p_platform: input.platform ?? null,
    p_browser: input.browser ?? null,
    p_device_class: input.deviceClass,
    p_app_version: input.appVersion ?? null,
    p_client_subject_key: rateLimitSubjectKey("device_installation", `client:${input.clientSubject}`),
    p_installation_subject_key: rateLimitSubjectKey("device_installation", `installation:${input.installationId}`),
  });

  if (result === "ok" || result === "client_rate_limited" || result === "installation_rate_limited") return result;
  throw new Error("DEVICE_INSTALLATION_RESULT_INVALID");
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

export async function changeClinicBookingStatus(input: {
  bookingId: string;
  status: "confirmed" | "completed" | "clinic_cancelled" | "no_show" | "failed";
}) {
  const actorId = await verifiedActor();
  return callOperationalRpc("change_booking_status_server", {
    p_actor_id: actorId,
    p_booking_id: input.bookingId,
    p_status: input.status,
  });
}

export async function createSettlementPeriod(input: { clinicId: string; periodStart: string; periodEnd: string; periodKind: "weekly" | "monthly" | "annual" | "manual"; notes?: string }) {
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

export async function verifyAndActivateSubject(input: { subjectType: "clinic" | "branch" | "practitioner"; subjectId: string; source: string; identifier?: string }) {
  const actorId = await verifiedActor();
  return callServerRpc("verify_and_activate_server", {
    p_actor_id: actorId,
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId,
    p_source: input.source,
    p_identifier: input.identifier ?? null,
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

export type ActivityReportGranularity = "hourly" | "daily" | "weekly" | "monthly";

export async function platformActivityReport(input: { periodStart: string; periodEnd: string; granularity: ActivityReportGranularity }) {
  const actorId = await verifiedActor();
  return callOperationalRpc("platform_activity_report_server", {
    p_actor_id: actorId,
    p_start: input.periodStart,
    p_end: input.periodEnd,
    p_granularity: input.granularity,
  });
}

export async function clinicActivityReport(input: { clinicId: string; periodStart: string; periodEnd: string; granularity: ActivityReportGranularity }) {
  const actorId = await verifiedActor();
  return callOperationalRpc("clinic_activity_report_server", {
    p_actor_id: actorId,
    p_clinic_id: input.clinicId,
    p_start: input.periodStart,
    p_end: input.periodEnd,
    p_granularity: input.granularity,
  });
}
