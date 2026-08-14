import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "أسناني قطر",
    short_name: "أسناني",
    description: "مقارنة أسعار الأسنان والتوفر والحجز في قطر",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    lang: "ar",
    dir: "rtl",
  };
}
