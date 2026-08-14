"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { reviewSchema, uuid } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login?next=/account");
  return { supabase, userId: data.claims.sub };
}

export async function cancelBooking(formData: FormData) {
  const parsed = z.object({ booking_id: uuid }).safeParse({ booking_id: formData.get("booking_id") });
  if (!parsed.success) return;
  const { supabase } = await requireUser();
  await supabase.from("bookings").update({ status: "patient_cancelled" }).eq("id", parsed.data.booking_id);
  revalidatePath("/account");
}

export async function submitReview(formData: FormData) {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { supabase, userId } = await requireUser();
  const { data: booking } = await supabase.from("bookings").select("id,clinic_id,practitioner_id,status").eq("id", parsed.data.booking_id).maybeSingle();
  if (!booking || booking.status !== "completed") return;
  await supabase.from("reviews").insert({
    booking_id: booking.id,
    patient_id: userId,
    clinic_id: booking.clinic_id,
    practitioner_id: booking.practitioner_id,
    rating: parsed.data.rating,
    review_text: parsed.data.review_text || null,
    status: "pending",
  });
  revalidatePath("/account");
}
