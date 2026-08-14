"use client";

import { useMemo, useState } from "react";
import type { Treatment, TreatmentVariant } from "@/lib/models";
import { Button, Select } from "@/components/ui";

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
    <form action="/results" className="grid gap-4" aria-label="البحث عن علاج أسنان">
      <label className="grid gap-2 text-sm font-bold text-slate-800">
        شو العلاج اللي بتدور عليه؟
        <Select name="treatment" value={treatmentId} onChange={(e) => { setTreatmentId(e.target.value); setVariantId(""); }} required>
          {treatments.map((t) => <option key={t.id} value={t.id}>{t.name_ar} — {t.name_en}</option>)}
        </Select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">
        نوع العلاج الدقيق
        <Select name="variant" value={effectiveVariant} onChange={(e) => setVariantId(e.target.value)} required>
          {availableVariants.map((v) => <option key={v.id} value={v.id}>{v.name_ar} — {v.name_en}</option>)}
        </Select>
      </label>
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="radius" value="10" />
      <label className="grid gap-2 text-sm font-bold text-slate-800">متى تحتاج الموعد؟<Select name="when" defaultValue="earliest"><option value="earliest">أقرب موعد</option><option value="today">اليوم</option><option value="tomorrow">غدًا</option></Select></label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50" onClick={locate}>
          {geoState === "loading" ? "جاري تحديد الموقع…" : geoState === "ok" ? "تم تحديد موقعي" : "استخدم موقعي"}
        </Button>
        <Button type="submit" disabled={!effectiveVariant} className="min-w-36 bg-teal-600 hover:bg-teal-700">اعرض الخيارات</Button>
        {geoState === "error" && <span className="text-xs font-semibold text-amber-700">يمكنك البحث بدون الموقع؛ لن يظهر ترتيب المسافة.</span>}
      </div>
    </form>
  );
}
