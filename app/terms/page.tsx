import { cookies } from "next/headers";
import { PublicPolicyTemplate } from "@/components/public-policy-template";
import { getLocale } from "@/lib/i18n";

export const metadata = { title: "شروط استخدام المنصة" };

export default async function TermsPage() {
  const cookieStore = await cookies();
  return <PublicPolicyTemplate locale={getLocale(cookieStore.get("asnani_locale")?.value)} kind="terms" />;
}
