import { jsonNoStore } from "@/lib/api-response";
import { parseSearchQuery } from "@/lib/search-query";
import { searchLiveOffers } from "@/lib/search-offers";

export async function GET(request: Request) {
  const parsed = parseSearchQuery(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return jsonNoStore({ error: "invalid_search" }, 400);
  }

  const { variant, lat: rawLat, lng: rawLng, radius, sort, when, practitioner_gender: practitionerGender } = parsed.data;
  const lat = rawLat === "" || rawLat === undefined ? null : rawLat;
  const lng = rawLng === "" || rawLng === undefined ? null : rawLng;
  const result = await searchLiveOffers({ variant, lat, lng, radius, when, sort, practitionerGender });
  if (result.error) {
    return jsonNoStore({ error: "search_unavailable" }, 503);
  }

  return jsonNoStore(
    { variant: result.variant, offers: result.offers, count: result.offers.length },
    200,
  );
}