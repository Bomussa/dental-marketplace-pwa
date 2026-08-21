import "server-only";

import type { Json } from "@/lib/database.types";
import { withOperationalTimeout } from "@/lib/operations.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n";

type NotificationChannel = "email" | "sms" | "push";
type NotificationEvent = "booking_confirmed" | "booking_cancelled" | "booking_updated" | "attendance_recorded" | "price_updated" | "support_reply" | "manual";

type EnqueueNotificationInput = {
  recipientUserId: string;
  eventType: NotificationEvent;
  eventId: string;
  channel: NotificationChannel;
  locale: Locale;
  payload: Json;
  createdBy?: string;
};

export async function enqueueNotification(input: EnqueueNotificationInput) {
  const admin = createAdminClient();
  const { data: template, error: templateError } = await withOperationalTimeout(admin
    .from("notification_templates")
    .select("id")
    .eq("template_key", input.eventType)
    .eq("channel", input.channel)
    .eq("locale", input.locale)
    .eq("status", "active")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle());
  if (templateError) throw new Error(templateError.code);

  const dedupeKey = `${input.eventType}:${input.eventId}:${input.recipientUserId}:${input.channel}:${input.locale}`;
  const { error } = await withOperationalTimeout(admin.from("notification_outbox").upsert({
    recipient_user_id: input.recipientUserId,
    template_id: template?.id ?? null,
    event_type: input.eventType,
    event_id: input.eventId,
    channel: input.channel,
    locale: input.locale,
    payload: input.payload,
    dedupe_key: dedupeKey,
    status: "pending",
    created_by: input.createdBy ?? null,
  }, { onConflict: "dedupe_key", ignoreDuplicates: true }));
  if (error) throw new Error(error.code);
}

export async function enqueueBookingConfirmedNotifications(input: {
  bookingId: string;
  bookingCode: string;
  patientUserId: string;
  clinicId: string;
  startsAt: string;
  patientLocale: Locale;
}) {
  const admin = createAdminClient();
  const payload = { booking_id: input.bookingId, booking_code: input.bookingCode, start_at: input.startsAt };
  await enqueueNotification({
    recipientUserId: input.patientUserId,
    eventType: "booking_confirmed",
    eventId: input.bookingId,
    channel: "push",
    locale: input.patientLocale,
    payload,
    createdBy: input.patientUserId,
  });

  const { data: clinicMembers, error } = await withOperationalTimeout(admin
    .from("clinic_memberships")
    .select("user_id")
    .eq("clinic_id", input.clinicId)
    .eq("status", "active")
    .in("role", ["owner", "manager", "receptionist"]));
  if (error) throw new Error(error.code);

  for (const member of clinicMembers ?? []) {
    await enqueueNotification({
      recipientUserId: member.user_id,
      eventType: "booking_confirmed",
      eventId: input.bookingId,
      channel: "push",
      locale: "ar",
      payload,
      createdBy: input.patientUserId,
    });
  }
}
