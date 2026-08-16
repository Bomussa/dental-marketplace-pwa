const MAX_QAR_MINOR = 10_000_000n; // 100,000.00 QAR
const QAR_PATTERN = /^(?:0|[1-9]\d{0,5})(?:\.(\d{1,2}))?$/;

export type OfferPriceType = "fixed" | "from" | "range" | "package" | "consultation_required";

export function qarInputToMinor(value: unknown): number {
  if (typeof value !== "string") throw new Error("INVALID_MONEY_INPUT");
  const input = value.trim();
  const match = QAR_PATTERN.exec(input);
  if (!match) throw new Error("INVALID_MONEY_INPUT");

  const [wholePart, fractionPart = ""] = input.split(".");
  const fraction = fractionPart.padEnd(2, "0");
  const minor = BigInt(wholePart) * 100n + BigInt(fraction || "0");
  if (minor < 0n || minor > MAX_QAR_MINOR) throw new Error("INVALID_MONEY_INPUT");
  return Number(minor);
}

export function optionalQarInputToMinor(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  return qarInputToMinor(value);
}

export function assertMoneyRange(minMinor: number | null, maxMinor: number | null) {
  if (minMinor !== null && (!Number.isSafeInteger(minMinor) || minMinor < 0)) throw new Error("INVALID_MONEY_INPUT");
  if (maxMinor !== null && (!Number.isSafeInteger(maxMinor) || maxMinor < 0)) throw new Error("INVALID_MONEY_INPUT");
  if (minMinor !== null && maxMinor !== null && maxMinor < minMinor) throw new Error("INVALID_MONEY_RANGE");
}

export function priceInputsToMinor(priceType: OfferPriceType, minInput: unknown, maxInput: unknown) {
  if (priceType === "consultation_required") return { minMinor: null, maxMinor: null };

  const minMinor = qarInputToMinor(minInput);
  if (priceType === "fixed") return { minMinor, maxMinor: minMinor };
  if (priceType === "from") return { minMinor, maxMinor: null };

  const maxMinor = optionalQarInputToMinor(maxInput);
  if (priceType === "range" && maxMinor === null) throw new Error("INVALID_MONEY_INPUT");
  assertMoneyRange(minMinor, maxMinor);
  return { minMinor, maxMinor };
}

export function normalizedOfferFormData(formData: FormData) {
  const values = Object.fromEntries(formData);
  const priceType = values.price_type;
  if (priceType === "consultation_required") {
    delete values.min_qar;
    delete values.max_qar;
  } else if (priceType === "fixed" || priceType === "from") {
    delete values.max_qar;
  } else {
    if (values.min_qar === "") delete values.min_qar;
    if (values.max_qar === "") delete values.max_qar;
  }
  return values;
}
