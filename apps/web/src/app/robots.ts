import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || "https://epilens.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: ["/api/", "/overview", "/data", "/model", "/results", "/scenarios", "/runs", "/methods"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
