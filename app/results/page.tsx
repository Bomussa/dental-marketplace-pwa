import { cookies } from "next/headers";
import Link from "next/link";
import { parseSearchQuery } from "@/lib/search-query";
import { searchLiveOffers } from "@/lib/search-offers";
import { priceLabel } from "@/lib/price";
import { Badge, Card } from "@/components/ui";
import { BookButton } from "@/components/book-button";
import { getServerAuthClaims, getServerSupabaseClient } from "@/lib/auth-claims.server";
import { withOperationalTimeout } from "@/lib/operations.server";
import { getDictionary, getLocale } from "@/lib/i18n";
import { ArrowUpLeftIcon, ClockIcon, LocationIcon, RouteIcon, ShieldCheckIcon, SlidersIcon, StarIcon } from "@/components/icons";
import { ResultsLiveRefresh } from "@/components/results-live-refresh";
import { PriceScopeSummary } from "@/components/price-scope-summary";
import type { SearchOffer } from "@/lib/models";

export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
function replaceTokens(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

function directionsHref(offer: SearchOffer) {
  if (offer.branch_latitude != null && offer.branch_longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${offer.branch_latitude},${offer.branch_longitude}`)}`;
  }
  const address = [offer.branch_address, offer.branch_name, offer.area, offer.clinic_name, "Qatar"].filter((value): value is string => Boolean(value)).join(", ");
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
}

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  const dateLocale = locale === "ar" ? "ar-QA" : "en-QA";
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeZone: "Asia/Qatar" });
  const dateTimeFormatter = new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Qatar" });
  const raw = await searchParams;
  const parsed = parseSearchQuery(raw);
  if (!parsed.success) {
    return (
      <main className="workspace-shell mx-auto max-w-4xl px-4 py-16">
        <Card className="p-8">
          <h1 className="text-2xl font-black">{t["results.invalidTitle"]}</h1>
          <p className="mt-3 text-slate-500">{t["results.invalidCopy"]}</p>
          <Link className="mt-6 inline-flex items-center gap-2 font-extrabold text-[#084884]" href="/">
            {t["results.backToSearch"]}<ArrowUpLeftIcon size={16} />
          </Link>
        </Card>
      </main>
    );
  }

  const lat = parsed.data.lat === "" || parsed.data.lat === undefined ? null : parsed.data.lat;
  const lng = parsed.data.lng === "" || parsed.data.lng === undefined ? null : parsed.data.lng;
  const when = parsed.data.when;
  const sort = parsed.data.sort;
  const practitionerGender = parsed.data.practitioner_gender;
  const sortLabel = t[`search.sort.${sort}`];
  const practitionerLabel = practitionerGender === "female" ? t["search.femalePractitioner"] : practitionerGender === "male" ? t["search.malePractitioner"] : t["search.anyPractitioner"];
  const [{ variant, offers, error }, { data: claimsData }] = await Promise.all([
    searchLiveOffers({ variant: parsed.data.variant, lat, lng, radius: parsed.data.radius, when, sort, practitionerGender }),
    getServerAuthClaims(),
  ]);
  const userId = claimsData?.claims?.sub;
  const supabase = await getServerSupabaseClient();
  const { data: patientProfileData } = userId
    ? await withOperationalTimeout(supabase.from("patient_profiles").select("id,display_name,relationship,national_id,nationality,date_of_birth,phone,phone_verified_at,gender").is("archived_at", null).order("created_at", { ascending: true })).catch(() => ({ data: [] }))
    : { data: [] };
  const patientProfiles = patientProfileData ?? [];
  const whenLabel = when === "today" ? t["search.today"] : when === "tomorrow" ? t["search.tomorrow"] : t["search.earliest"];
  const variantName = locale === "ar" ? variant?.name_ar : variant?.name_en;

  return (
    <main className="workspace-shell relative mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <div className="results-hero mb-8 flex flex-wrap items-end justify-between gap-5 rounded-[28px] p-7 text-white sm:p-10">
        <div>
          <p className="relative text-[.78rem] font-black uppercase tracking-[.18em] text-cyan-100">{t["results.kicker"]}</p>
          <h1 className="relative mt-3 text-4xl font-black tracking-[-.045em] text-white sm:text-5xl">{variantName ?? t["results.fallbackTitle"]}</h1>
          <p className="relative mt-3 max-w-2xl text-[.98rem] font-semibold leading-7 text-blue-50/90">{t["results.intro"]}</p>
        </div>
        <Link href="/" className="relative inline-flex min-h-11 items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 text-sm font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18)] transition hover:-translate-y-0.5 hover:bg-white/20">
          <ArrowUpLeftIcon size={17} />{t["results.newSearch"]}
        </Link>
      </div>

      <div className="results-context mb-7 flex flex-wrap items-center gap-2.5 rounded-[18px] px-5 py-3.5 text-[.84rem] font-extrabold text-blue-50/95">
        <SlidersIcon size={17} className="text-[#83f1d5]" />
        <span>{whenLabel}</span><span className="text-white/35">•</span>
        <span>{replaceTokens(t["results.sortedBy"], { sort: sortLabel })}</span><span className="text-white/35">•</span>
        <span>{replaceTokens(t["results.radius"], { radius: parsed.data.radius })}</span><span className="text-white/35">•</span>
        <span>{practitionerLabel}</span><span className="text-white/35">•</span>
        <span>{replaceTokens(t["results.count"], { count: offers.length })}</span><span className="text-white/35">•</span>
        <ResultsLiveRefresh variantId={parsed.data.variant} locale={locale} />
      </div>

      {error ? <Card className="p-7 text-red-700">{t["results.loadError"]}: {error}</Card> : offers.length === 0 ? (
        <Card className="p-11 text-center sm:p-14">
          <h2 className="text-2xl font-black tracking-[-.03em]">{t["results.emptyTitle"]}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[.98rem] font-medium leading-7 text-slate-500">{t["results.emptyCopy"]}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer, index) => (
            <Card key={offer.offer_id} className="lift overflow-hidden p-0">
              <div className="grid lg:grid-cols-[1fr_315px]">
                <div className="p-6 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="result-rank grid h-8 min-w-8 place-items-center rounded-full px-2 text-[11px] font-black text-white">{index + 1}</span>
                        {offer.last_verified_at && <Badge tone="blue"><span className="inline-flex items-center gap-1"><ShieldCheckIcon size={13} />{t["results.verified"]}</span></Badge>}
                        <Badge tone={offer.open_now ? "green" : "slate"}>{offer.open_now ? t["results.openNow"] : t["results.closedNow"]}</Badge>
                      </div>
                      <h2 className="mt-4 truncate text-2xl font-black tracking-[-.035em] sm:text-[1.8rem]">{offer.clinic_name}</h2>
                      <p className="mt-2 flex items-center gap-1.5 text-[.96rem] font-semibold text-slate-500"><LocationIcon size={15} />{offer.branch_name}{offer.area ? ` · ${offer.area}` : ""}</p>
                    </div>
                    {Number(offer.review_count) > 0 && <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-800"><StarIcon size={14} className="text-amber-500" />{Number(offer.rating_avg).toFixed(1)}<span className="font-bold text-slate-400">({offer.review_count})</span></div>}
                  </div>

                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="result-fact rounded-2xl p-3.5"><div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><ClockIcon size={14} />{t["results.duration"]}</div><div className="mt-1 text-sm font-black">{replaceTokens(t["results.minutes"], { minutes: offer.duration_minutes })}</div></div>
                    <div className="result-fact rounded-2xl p-3.5"><div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><LocationIcon size={14} />{t["results.distance"]}</div><div className="mt-1 text-sm font-black">{offer.distance_km == null ? t["results.distanceUnavailable"] : replaceTokens(t["results.distanceValue"], { distance: offer.distance_km.toFixed(1) })}</div></div>
                    <div className="result-fact result-fact--quiet rounded-2xl p-3.5 sm:col-span-2 lg:col-span-1"><div className="text-[11px] font-bold text-slate-500">{t["results.lastVerified"]}</div><div className="mt-1 text-sm font-black">{offer.last_verified_at ? dateFormatter.format(new Date(offer.last_verified_at)) : t["results.notRecorded"]}</div></div>
                    <div className="result-fact rounded-2xl p-3.5 sm:col-span-2 lg:col-span-1"><div className="text-[11px] font-bold text-slate-500">{t["results.practitioner"]}</div><div className="mt-1 text-sm font-black">{offer.earliest_practitioner_name ?? t["results.practitionerUnavailable"]}</div></div>
                  </div>
                  <PriceScopeSummary offer={offer} locale={locale} />
                  {directionsHref(offer) ? <a href={directionsHref(offer) ?? undefined} target="_blank" rel="noreferrer" className="result-directions mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-black"><RouteIcon size={16}/>{t["results.directions"]}</a> : <p className="mt-4 text-xs font-bold text-slate-400">{t["results.directionsUnavailable"]}</p>}
                </div>

                <aside className="result-pricing border-t p-6 sm:p-7 lg:border-s lg:border-t-0">
                  <div className="text-xs font-extrabold text-slate-500">{t["results.advertisedPrice"]}</div><div className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-950">{priceLabel(offer.price_type, offer.min_minor, offer.max_minor, locale)}</div>
                  <div className="mt-5 text-xs font-extrabold text-slate-500">{t["results.nearestAppointment"]}</div><div className="mt-2 min-h-10 text-[.98rem] font-black leading-7">{offer.earliest_slot_at ? dateTimeFormatter.format(new Date(offer.earliest_slot_at)) : t["results.noAppointment"]}</div>
                  <div className="mt-4">{offer.earliest_slot_id ? <BookButton offerId={offer.offer_id} slotId={offer.earliest_slot_id} patientProfiles={patientProfiles} isAuthenticated={Boolean(userId)} /> : <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-extrabold leading-5 text-amber-800">{t["results.comparisonOnly"]}</div>}</div>
                </aside>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
