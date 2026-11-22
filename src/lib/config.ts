export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://safartripplanner.online").replace(/\/$/, "");
export const FARE_API = process.env.NEXT_PUBLIC_FARE_API || "";

export const TP_MARKER = "809430";
export const TP_TRS = "604552";

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return `${BASE_PATH}/${path}`;
  return `${BASE_PATH}${path}`;
}
