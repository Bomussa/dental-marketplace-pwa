import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "أسناني قطر",
    short_name: "أسناني",
    description: "مقارنة أسعار الأسنان والتوفر والحجز في قطر",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/pwa/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/pwa/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
