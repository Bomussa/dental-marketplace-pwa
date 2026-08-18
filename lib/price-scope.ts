export const PRICE_SCOPE_KEYS = [
  "registration",
  "examination",
  "xray",
  "diagnostics",
  "anesthesia",
  "laboratory",
  "medications",
] as const;

export type PriceScopeKey = (typeof PRICE_SCOPE_KEYS)[number];
export const PRICE_SCOPE_STATUSES = ["included", "excluded", "assessment_required", "not_applicable"] as const;
export type PriceScopeStatus = (typeof PRICE_SCOPE_STATUSES)[number];
export type PriceScope = Record<PriceScopeKey, PriceScopeStatus>;

export const EMPTY_PRICE_SCOPE: PriceScope = {
  registration: "assessment_required",
  examination: "assessment_required",
  xray: "assessment_required",
  diagnostics: "assessment_required",
  anesthesia: "assessment_required",
  laboratory: "assessment_required",
  medications: "assessment_required",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parsePriceScope(value: unknown): PriceScope | null {
  if (!isRecord(value)) return null;
  const scope = {} as PriceScope;
  for (const key of PRICE_SCOPE_KEYS) {
    const status = value[key];
    if (typeof status !== "string" || !PRICE_SCOPE_STATUSES.includes(status as PriceScopeStatus)) return null;
    scope[key] = status as PriceScopeStatus;
  }
  return scope;
}

export function priceScopeFromFormData(formData: FormData): PriceScope {
  const candidate = Object.fromEntries(PRICE_SCOPE_KEYS.map((key) => [key, formData.get(`scope_${key}`)]));
  const scope = parsePriceScope(candidate);
  if (!scope) throw new Error("INVALID_PRICE_SCOPE");
  return scope;
}

export function priceScopeItemsFromFormData(formData: FormData, field: "included_items" | "excluded_items"): string[] {
  const raw = formData.get(field);
  if (typeof raw !== "string") return [];
  const values = raw.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean);
  if (values.length > 24 || values.some((value) => value.length > 160)) throw new Error("INVALID_PRICE_SCOPE_ITEMS");
  return [...new Set(values)];
}

export function priceScopeNotesFromFormData(formData: FormData, field: "follow_up_terms" | "notes"): string | null {
  const raw = formData.get(field);
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.length > 1000) throw new Error("INVALID_PRICE_SCOPE_NOTES");
  return value || null;
}

export function priceScopeVisitCountFromFormData(formData: FormData): number | null {
  const raw = formData.get("visit_count");
  if (raw === null || raw === "") return null;
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || value < 1 || value > 99) throw new Error("INVALID_PRICE_SCOPE_VISITS");
  return value;
}
