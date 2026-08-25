import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { Treatment, TreatmentVariant } from "@/lib/models";
import type { Database } from "@/lib/database.types";
import { withOperationalTimeout } from "@/lib/operations.server";

export const ACTIVE_TREATMENT_CATALOG_TAG = "active-treatment-catalog";

function createPublicCatalogClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Public catalog access is not configured.");

  return createClient<Database>(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

const readActiveTreatmentCatalog = unstable_cache(
  async () => {
    const supabase = createPublicCatalogClient();
    const [{ data: treatments, error: treatmentsError }, { data: variants, error: variantsError }] = await Promise.all([
      withOperationalTimeout(supabase.from("treatment_catalog").select("id,code,category,name_ar,name_en").eq("active", true).order("category").order("name_ar")),
      withOperationalTimeout(supabase.from("treatment_variants").select("id,catalog_id,variant_key,name_ar,name_en").eq("active", true).order("name_ar")),
    ]);

    return {
      treatments: (treatments ?? []) as Treatment[],
      variants: (variants ?? []) as TreatmentVariant[],
      hasError: Boolean(treatmentsError || variantsError),
    };
  },
  ["active-treatment-catalog-v1"],
  { revalidate: 60, tags: [ACTIVE_TREATMENT_CATALOG_TAG] },
);

export function getActiveTreatmentCatalog() {
  return readActiveTreatmentCatalog();
}
