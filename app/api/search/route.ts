import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchSchema } from "@/lib/validation";
import { searchLiveOffers } from "@/lib/search-offers";

const whenSchema = z.enum(["earliest", "today", "tomorrow"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = searchSchema.safeParse({
    variant: params.get("variant"),
    lat: params.get("lat") ?? "",
    lng: params.get("lng") ?? "",
    radius: params.get("radius") ?? "10",
    sort: params.get("sort") ?? "balanced",
  });
  const when = whenSchema.safeParse(params.get("when") ?? "earliest");
  if (!parsed.success || !when.success) {
    return NextResponse.json({ error: "invalid_search" }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const lat = parsed.data.lat === "" || parsed.data.lat === undefined ? null : parsed.data.lat;
  const lng = parsed.data.lng === "" || parsed.data.lng === undefined ? null : parsed.data.lng;
  const result = await searchLiveOffers({
    variant: parsed.data.variant,
    lat,
    lng,
    radius: parsed.data.radius,
    when: when.data,
    sort: parsed.data.sort,
  });
  if (result.error) {
    return NextResponse.json({ error: "search_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json(
    { variant: result.variant, offers: result.offers, count: result.offers.length },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
