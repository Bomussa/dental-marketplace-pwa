import { NextRequest, NextResponse } from "next/server";
import { parseSearchQuery } from "@/lib/search-query";
import { searchLiveOffers } from "@/lib/search-offers";

export async function GET(request: NextRequest) {
  const parsed = parseSearchQuery(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_search" }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const { variant, lat: rawLat, lng: rawLng, radius, sort, when } = parsed.data;
  const lat = rawLat === "" || rawLat === undefined ? null : rawLat;
  const lng = rawLng === "" || rawLng === undefined ? null : rawLng;
  const result = await searchLiveOffers({ variant, lat, lng, radius, when, sort });
  if (result.error) {
    return NextResponse.json({ error: "search_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json(
    { variant: result.variant, offers: result.offers, count: result.offers.length },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
