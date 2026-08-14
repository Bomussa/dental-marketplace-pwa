"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { featureFlagSchema, uuid, verificationSchema } from "@/lib/validation";

async function requireAdmin() {
  const supabase=await createClient(); const {data,error}=await supabase.auth.getClaims(); const meta=(data?.claims?.app_metadata??{}) as Record<string,unknown>;
  if(error||!data?.claims?.sub||meta.platform_admin!==true)redirect("/"); return supabase;
}
export async function verifyAndActivate(formData:FormData){const parsed=verificationSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return;const supabase=await requireAdmin();const {subject_type,subject_id,source,identifier}=parsed.data;const {error}=await supabase.from("verification_records").insert({subject_type,subject_id,source,identifier:identifier||null,status:"verified",verified_at:new Date().toISOString()});if(error)return;if(subject_type==="clinic")await supabase.from("clinics").update({status:"active"}).eq("id",subject_id);if(subject_type==="branch")await supabase.from("branches").update({status:"active"}).eq("id",subject_id);if(subject_type==="practitioner")await supabase.from("practitioners").update({active:true}).eq("id",subject_id);revalidatePath("/admin");revalidatePath("/clinic");}
export async function updateFeatureFlag(formData:FormData){const parsed=featureFlagSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return;const supabase=await requireAdmin();await supabase.from("feature_flags").update({enabled:parsed.data.enabled,updated_at:new Date().toISOString()}).eq("key",parsed.data.key);revalidatePath("/admin");}
export async function moderateReview(formData:FormData){const parsed=z.object({id:uuid,status:z.enum(["published","hidden","removed"])}).safeParse(Object.fromEntries(formData));if(!parsed.success)return;const supabase=await requireAdmin();await supabase.from("reviews").update({status:parsed.data.status}).eq("id",parsed.data.id);revalidatePath("/admin");}
