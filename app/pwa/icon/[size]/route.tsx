import { ImageResponse } from "next/og";
import { AppIconArtwork } from "@/components/app-icon-artwork";

const supportedSizes = new Set([192, 512]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
) {
  const { size } = await context.params;
  const pixels = Number.parseInt(size, 10);

  if (!supportedSizes.has(pixels)) {
    return new Response("Not Found", { status: 404 });
  }

  return new ImageResponse(<AppIconArtwork size={pixels} />, {
    width: pixels,
    height: pixels,
  });
}
