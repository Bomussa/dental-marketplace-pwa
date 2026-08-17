import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const icons: MetadataRoute.Manifest["icons"] = [192, 512].flatMap((size) => [
    { src: `/pwa/icon/${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" as const },
    { src: `/pwa/icon/${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" as const },
  ]);
  return { id: "/", name: "أسناني قطر", short_name: "أسناني", description: "مقارنة أسعار الأسنان والتوفر والحجز في قطر", start_url: "/", scope: "/", display: "standalone", background_color: "#F4F8F8", theme_color: "#0B5CAD", lang: "ar", dir: "rtl", icons };
}
