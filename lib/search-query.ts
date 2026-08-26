import { searchQuerySchema } from "@/lib/validation";

export type SearchQueryInput = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseSearchQuery(input: SearchQueryInput) {
  return searchQuerySchema.safeParse({
    variant: first(input.variant),
    lat: first(input.lat) ?? "",
    lng: first(input.lng) ?? "",
    radius: first(input.radius) ?? "10",
    sort: first(input.sort) ?? "balanced",
    practitioner_gender: first(input.practitioner_gender) ?? "",
    when: first(input.when) ?? "earliest",
  });
}
