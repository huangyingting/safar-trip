import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/config";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Safar · Trip Planner",
    short_name: "Safar",
    description:
      "Plan a trip in your budget: destinations, costs, day-by-day plan and live flight prices.",
    start_url: withBasePath("/?source=homescreen"),
    scope: withBasePath("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#07090e",
    theme_color: "#ff7a1a",
    icons: [
      {
        src: withBasePath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: withBasePath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: withBasePath("/icons/maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
