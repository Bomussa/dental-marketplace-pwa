"use client";

import { useMemo, useState } from "react";
import type { Treatment, TreatmentVariant } from "@/lib/models";
import { Button } from "@/components/ui";
import { CalendarIcon, LocationIcon, SearchIcon, ToothIcon } from "@/components/icons";

export function SearchForm({ treatments, variants }: { treatments: Treatment[]; variants: TreatmentVariant[] }) {
  const [treatmentId, setTreatmentId] = useState(treatments[0]?.id ?? "");
  const [variantId, setVariantId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const availableVariants = useMemo(() => variants.filter((v) => v.catalog_id === treatmentId), [variants, treatmentId]);
  const effectiveVariant = variantId || availableVariants[0]?.id || "";

  function locate() {
    if (!navigator.geolocation) return setGeoState("error");
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(3));
        setLng(pos.coords.longitude.toFixed(3));
        setGeoState("ok");
      },
      () => setGeoState("error"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
    );
  }

  return (
    <form action="/results" className="grid gap-3" aria-label="البحث عن علاج أسنان">
      <div className="segmented-search grid overflow-hidden rounded-[30px] lg:grid-cols-[1.05fr_1.15fr_.72fr_auto] lg:items-stretch lg:rounded-full">
        <label className="search-segment min-w-0 border-b border-slate-200/70 px-5 py-3.5 lg:border-b-0 lg:border-e">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500"><ToothIcon size={15}/>العلاج</span>
          <select name="treatment" value={treatmentId} onChange={(e) => { setTreatmentId(e.target.value); setVariantId(""); }} required className="mt-1.5 h-7 w-full min-w-0 bg-transparent text-sm font-black text-slate-950 outline-none">
            {treatments.map((t) => <option key={t.id} value={t.id}>{t.name_ar} — {t.name_en}</option>)}
          </select>
        </label>
        <label className="search-segment min-w-0 border-b border-slate-200/70 px-5 py-3.5 lg:border-b-0 lg:border-e">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500"><SearchIcon size={15}/>النوع الدقيق</span>
          <select name="variant" value={effectiveVariant} onChange={(e) => setVariantId(e.target.value)} required className="mt-1.5 h-7 w-full min-w-0 bg-transparent text-sm font-black text-slate-950 outline-none">
            {availableVariants.map((v) => <option key={v.id} value={v.id}>{v.name_ar} — {v.name_en}</option>)}
          </select>
        </label>
        <label className="search-segment border-b border-slate-200/70 px-5 py-3.5 lg:border-b-0 lg:border-e">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500"><CalendarIcon size={15}/>الموعد</span>
          <select name="when" defaultValue="earliest" className="mt-1.5 h-7 w-full bg-transparent text-sm font-black text-slate-950 outline-none">
            <option value="earliest">أقرب موعد</option><option value="today">اليوم</option><option value="tomorrow">غدًا</option>
          </select>
        </label>
        <div className="flex items-center p-2.5">
          <Button type="submit" disabled={!effectiveVariant} className="w-full gap-2 lg:w-auto lg:px-5"><SearchIcon size={18}/><span>عرض النتائج</span></Button>
        </div>
      </div>
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="radius" value="10" />
      <div className="flex min-h-9 flex-wrap items-center justify-center gap-2.5 px-2 lg:justify-start">
        <button type="button" onClick={locate} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white/75 px-3.5 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200/80 transition hover:bg-white">
          <LocationIcon size={16}/>{geoState === "loading" ? "جاري تحديد الموقع…" : geoState === "ok" ? "تم استخدام موقعك التقريبي" : "استخدم موقعي لترتيب الأقرب"}
        </button>
        {geoState === "ok" && <span className="text-[11px] font-bold text-slate-500">نقرّب الإحداثيات قبل البحث حفاظًا على الخصوصية.</span>}
        {geoState === "error" && <span className="text-[11px] font-bold text-amber-700">يمكنك المتابعة بدون الموقع؛ لن يظهر ترتيب المسافة.</span>}
      </div>
    </form>
  );
}
