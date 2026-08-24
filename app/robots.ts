import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/login", "/auth", "/api", "/clinic", "/operation-error", "/results"],
    },
    sitemap: "https://www.mmc-mms.com/sitemap.xml",
  };
}
