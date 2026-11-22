import type { MetadataRoute } from "next";
import { SITE_URL, withBasePath } from "@/lib/config";
import { DESTINATIONS } from "@/lib/data";
import { BUDGET_GUIDES } from "@/lib/guides";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-22T00:00:00.000Z");

  return [
    {
      url: `${SITE_URL}${withBasePath("/")}`,
      lastModified,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}${withBasePath("/guides/")}`,
      lastModified,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}${withBasePath("/app/")}`,
      lastModified,
      priority: 0.7,
    },
    ...DESTINATIONS.map((d) => ({
      url: `${SITE_URL}${withBasePath(`/guides/${d.id}/`)}`,
      lastModified,
      priority: 0.8,
    })),
    ...BUDGET_GUIDES.map((b) => ({
      url: `${SITE_URL}${withBasePath(`/guides/${b.slug}/`)}`,
      lastModified,
      priority: 0.8,
    })),
  ];
}
