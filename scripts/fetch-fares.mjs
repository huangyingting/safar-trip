import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const UPSTREAM = process.env.FARE_UPSTREAM || "https://safar-fares.safar-trips.workers.dev";
const OUT_FILE = resolve(process.cwd(), "public/fares-cache.json");
const WORKER_SRC = resolve(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const WORKER_DEST = resolve(process.cwd(), "public/maplibre-gl-worker.js");

function syncMaplibreWorker() {
  if (!existsSync(WORKER_SRC)) return;
  const raw = readFileSync(WORKER_SRC, "utf8").replace(/\/\/# sourceMappingURL=.*$/m, "");
  writeFileSync(WORKER_DEST, raw);
}

const ORIGIN_IATAS = ["DEL", "BOM", "BLR", "MAA", "CCU", "HYD", "PNQ", "AMD", "JAI", "COK"];
const DEST_IATAS = [
  "GOI", "KUU", "DED", "UDR", "JSA", "SLV", "IXL", "VNS", "ATQ", "AGR",
  "IXB", "GAU", "IXZ", "COK", "TRV", "MAA", "CJB", "IXE", "HBX", "PNQ",
  "BHJ", "JAI", "PGH", "DHM", "SXR", "BKK", "DXB", "HAN", "DPS", "KTM",
  "CMB", "MLE", "SIN",
];

function targetMonths() {
  const now = new Date();
  const out = [];
  for (const offset of [1, 2]) {
    const m = ((now.getMonth() + offset) % 12) + 1;
    const y = now.getFullYear() + (now.getMonth() + offset >= 12 ? 1 : 0);
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

async function fetchOne(from, to, month) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`${UPSTREAM}/api/fare?from=${from}&to=${to}&month=${month}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json && json.found ? json : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  syncMaplibreWorker();
  if (process.env.SKIP_FARE_PREFETCH === "1") {
    if (!existsSync(OUT_FILE)) {
      writeFileSync(OUT_FILE, JSON.stringify({ generated_at: new Date().toISOString(), fares: {} }));
    }
    return;
  }

  let existing = {};
  if (existsSync(OUT_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(OUT_FILE, "utf8"));
      existing = parsed.fares || {};
      const ageMs = Date.now() - Date.parse(parsed.generated_at || "");
      if (
        !process.env.CI &&
        process.env.FORCE_FARE_PREFETCH !== "1" &&
        Object.keys(existing).length >= 50 &&
        Number.isFinite(ageMs) &&
        ageMs < 60 * 60 * 1000
      ) {
        console.log(
          `[fetch-fares] Using fresh fares-cache.json (${Object.keys(existing).length} keys).`
        );
        return;
      }
    } catch {
      existing = {};
    }
  }

  const months = targetMonths();
  const tasks = [];
  for (const month of months) {
    for (const from of ORIGIN_IATAS) {
      for (const to of DEST_IATAS) {
        if (from !== to) tasks.push({ key: `${from}-${to}-${month}`, from, to, month });
      }
    }
  }

  const fares = { ...existing };
  const CONCURRENCY = 24;
  let idx = 0;
  let foundCount = 0;

  async function worker() {
    while (idx < tasks.length) {
      const t = tasks[idx++];
      const data = await fetchOne(t.from, t.to, t.month);
      if (data) {
        fares[t.key] = data;
        foundCount++;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  writeFileSync(
    OUT_FILE,
    JSON.stringify({
      generated_at: new Date().toISOString(),
      fares,
    })
  );
  console.log(`[fetch-fares] Cached ${foundCount} live flight fares (${Object.keys(fares).length} total keys).`);
}

main().catch((err) => {
  console.warn("[fetch-fares] Warning:", err?.message || err);
  if (!existsSync(OUT_FILE)) {
    writeFileSync(OUT_FILE, JSON.stringify({ generated_at: new Date().toISOString(), fares: {} }));
  }
});
