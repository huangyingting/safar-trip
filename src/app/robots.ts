import type { MetadataRoute } from "next";
import { SITE_URL, withBasePath } from "@/lib/config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [withBasePath("/get-app"), withBasePath("/downloads/")],
    },
    sitemap: `${SITE_URL}${withBasePath("/sitemap.xml")}`,
  };
}
