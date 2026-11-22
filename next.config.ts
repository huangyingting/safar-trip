import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: isDev ? undefined : "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: {
    unoptimized: true,
  },
  ...(isDev
    ? {
        async rewrites() {
          return [
            {
              source: "/api/fare",
              destination: "https://safar-fares.safar-trips.workers.dev/api/fare",
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
