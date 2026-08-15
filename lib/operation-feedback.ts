export type OperationArea = "clinic" | "admin";
export type OperationFailureCode = "invalid" | "forbidden" | "conflict" | "unavailable";

export function operationFailureCode(error: unknown): OperationFailureCode {
  const code = error instanceof Error ? error.message : "";
  if (code === "42501" || code === "FORBIDDEN" || code === "AUTHORIZATION_FAILED") return "forbidden";
  if (["23505", "23P01", "55000", "P0001", "CONFLICT"].includes(code)) return "conflict";
  return "unavailable";
}

export function operationFailureUrl(area: OperationArea, action: string, code: OperationFailureCode) {
  const params = new URLSearchParams({ area, action, code });
  return `/operation-error?${params.toString()}`;
}
