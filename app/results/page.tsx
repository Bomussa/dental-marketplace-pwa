import { cookies } from "next/headers";
import Link from "next/link";
import { searchSchema } from "@/lib/validation";
import { searchLiveOffers, type SearchSort, type WhenPreference } from "@/lib/search-offers";
import { priceLabel } from "@/lib/price";
import { Badge, Card } from "@/components/ui";
import { BookButton } from "@/components/book-button";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale } from "@/lib/i18n";
import { ArrowUpLeftIcon, ClockIcon, LocationIcon, RouteIcon, ShieldCheckIcon, SlidersIcon, StarIcon } from "@/components/icons";
import { ResultsLiveRefresh } from "@/components/results-live-refresh";
import { PriceScopeSummary } from "@/components/price-scope-summary";

export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
function scalar(v: string | string[] | undefined) { return Array.isArray(v) ? v[0] : v; }
function replaceTokens(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  const dateLocale = locale === "ar" ? "ar-QA" : "en-QA";
  const raw = await searchParams;
  const parsed = searchSchema.safeParse({ variant: scalar(raw.variant), lat: scalar(raw.lat) ?? "", lng: scalar(raw.lng) ?? "", radius: scalar(raw.radius) ?? "10", sort: scalar(raw.sort) ?? "balanced" });
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
  const rawWhen = scalar(raw.when) ?? "earliest";
  const when: WhenPreference = rawWhen === "today" || rawWhen === "tomorrow" ? rawWhen : "earliest";
  const sort: SearchSort = parsed.data.sort;
  const sortLabel = t[`search.sort.${sort}`];
  const supabase = await createClient();
  const [{ variant, offers, error }, { data: claimsData }] = await Promise.all([
    searchLiveOffers({ variant: parsed.data.variant, lat, lng, radius: parsed.data.radius, when, sort }),
    supabase.auth.getClaims(),
  ]);
  const userId = claimsData?.claims?.sub;
  const { data: patientProfileData } = userId
    ? await supabase.from("patient_profiles").select("id,display_name,relationship,national_id,nationality,date_of_birth,phone,phone_verified_at,gender").is("archived_at", null).order("created_at", { ascending: true })
    : { data: [] };
  const patientProfiles = patientProfileData ?? [];
  const whenLabel = when === "today" ? t["search.today"] : when === "tomorrow" ? t["search.tomorrow"] : t["search.earliest"];
  const variantName = locale === "ar" ? variant?.name_ar : variant?.name_en;

  return (
    <main className="workspace-shell relative mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <div className="surface-aurora mb-7 flex flex-wrap items-end justify-between gap-4 rounded-[32px] p-6 text-white sm:p-8">
        <div>
          <p className="relative text-xs font-black uppercase tracking-[.18em] text-cyan-100">{t["results.kicker"]}</p>
          <h1 className="relative mt-2 text-3xl font-black tracking-[-.035em] text-white sm:text-4xl">{variantName ?? t["results.fallbackTitle"]}</h1>
          <p className="relative mt-2 text-sm font-medium text-blue-50/82">{t["results.intro"]}</p>
        </div>
        <Link href="/" className="relative inline-flex min-h-11 items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 text-sm font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18)] transition hover:-translate-y-0.5 hover:bg-white/20">
          <ArrowUpLeftIcon size={17} />{t["results.newSearch"]}
        </Link>
      </div>

      <div className="surface-aurora mb-6 flex flex-wrap items-center gap-2 rounded-[24px] px-4 py-3 text-xs font-extrabold text-blue-50/95">
        <SlidersIcon size={17} className="text-[#83f1d5]" />
        <span>{whenLabel}</span><span className="text-white/35">•</span>
        <span>{replaceTokens(t["results.sortedBy"], { sort: sortLabel })}</span><span className="text-white/35">•</span>
        <span>{replaceTokens(t["results.radius"], { radius: parsed.data.radius })}</span><span className="text-white/35">•</span>
        <span>{replaceTokens(t["results.count"], { count: offers.length })}</span><span className="text-white/35">•</span>
        <ResultsLiveRefresh variantId={parsed.data.variant} locale={locale} />
      </div>

      {error ? <Card className="p-7 text-red-700">{t["results.loadError"]}: {error}</Card> : offers.length === 0 ? (
        <Card className="p-10 text-center">
          <h2 className="text-xl font-black">{t["results.emptyTitle"]}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{t["results.emptyCopy"]}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer, index) => (
            <Card key={offer.offer_id} className="lift overflow-hidden p-0">
              <div className="grid lg:grid-cols-[1fr_290px]">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="grid h-8 min-w-8 place-items-center rounded-full bg-[linear-gradient(135deg,#0e62c9,#0aa59f)] px-2 text-[11px] font-black text-white shadow-[0_9px_18px_-10px_rgba(4,101,184,.7)]">{index + 1}</span>
                        {offer.last_verified_at && <Badge tone="blue"><span className="inline-flex items-center gap-1"><ShieldCheckIcon size={13} />{t["results.verified"]}</span></Badge>}
                        <Badge tone={offer.open_now ? "green" : "slate"}>{offer.open_now ? t["results.openNow"] : t["results.closedNow"]}</Badge>
                      </div>
                      <h2 className="mt-3 truncate text-xl font-black tracking-tight sm:text-2xl">{offer.clinic_name}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500"><LocationIcon size={15} />{offer.branch_name}{offer.area ? ` · ${offer.area}` : ""}</p>
                    </div>
                    {Number(offer.review_count) > 0 && <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-800"><StarIcon size={14} className="text-amber-500" />{Number(offer.rating_avg).toFixed(1)}<span className="font-bold text-slate-400">({offer.review_count})</span></div>}
                  </div>

                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-[#0e699e]/[.08] bg-[linear-gradient(135deg,rgba(239,251,250,.96),rgba(239,246,255,.94))] p-3.5"><div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><ClockIcon size={14} />{t["results.duration"]}</div><div className="mt-1 text-sm font-black">{replaceTokens(t["results.minutes"], { minutes: offer.duration_minutes })}</div></div>
                    <div className="rounded-2xl border border-[#0e699e]/[.08] bg-[linear-gradient(135deg,rgba(239,251,250,.96),rgba(239,246,255,.94))] p-3.5"><div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><LocationIcon size={14} />{t["results.distance"]}</div><div className="mt-1 text-sm font-black">{offer.distance_km == null ? t["results.distanceUnavailable"] : replaceTokens(t["results.distanceValue"], { distance: offer.distance_km.toFixed(1) })}</div></div>
                    <div className="rounded-2xl bg-slate-50/90 p-3.5 sm:col-span-2 lg:col-span-1"><div className="text-[11px] font-bold text-slate-500">{t["results.lastVerified"]}</div><div className="mt-1 text-sm font-black">{offer.last_verified_at ? new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeZone: "Asia/Qatar" }).format(new Date(offer.last_verified_at)) : t["results.notRecorded"]}</div></div>
                  </div>
                  <PriceScopeSummary offer={offer} locale={locale} />
                  {offer.branch_latitude != null && offer.branch_longitude != null ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${offer.branch_latitude},${offer.branch_longitude}`)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0b71a2]/15 bg-white px-4 text-xs font-black text-[#084884] transition hover:-translate-y-0.5 hover:border-[#0b71a2]/35 hover:bg-cyan-50"><RouteIcon size={16}/>{t["results.directions"]}</a> : <p className="mt-4 text-xs font-bold text-slate-400">{t["results.directionsUnavailable"]}</p>}
                </div>

                <aside className="border-t border-[#0d6f99]/10 bg-[linear-gradient(150deg,rgba(230,250,247,.95),rgba(233,240,255,.94))] p-5 sm:p-6 lg:border-s lg:border-t-0">
                  <div className="text-xs font-extrabold text-slate-500">{t["results.advertisedPrice"]}</div><div className="mt-1 text-2xl font-black tracking-tight text-slate-950">{priceLabel(offer.price_type, offer.min_minor, offer.max_minor, locale)}</div>
                  <div className="mt-5 text-xs font-extrabold text-slate-500">{t["results.nearestAppointment"]}</div><div className="mt-1 min-h-10 text-sm font-black leading-6">{offer.earliest_slot_at ? new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Qatar" }).format(new Date(offer.earliest_slot_at)) : t["results.noAppointment"]}</div>
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
