export type OperationArea = "clinic" | "admin";
export type OperationFailureCode = "invalid" | "forbidden" | "conflict" | "unavailable";

export function operationFailureCode(error: unknown): OperationFailureCode {
  const code = error instanceof Error ? error.message : "";
  if (code === "42501" || code === "FORBIDDEN" || code === "AUTHORIZATION_FAILED") return "forbidden";
  if (code === "23505" || code === "P0001" || code === "CONFLICT") return "conflict";
  return "unavailable";
}

export function operationFailureUrl(area: OperationArea, action: string, code: OperationFailureCode) {
  const params = new URLSearchParams({ area, action, code });
  return `/operation-error?${params.toString()}`;
}
