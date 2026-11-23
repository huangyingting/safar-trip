"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { FARE_API, SITE_URL, withBasePath } from "@/lib/config";
import {
  DESTINATIONS,
  GroupType,
  IATA,
  MONTHS,
  ORIGINS,
  ScopeType,
  SHORT_MONTHS,
  SortType,
  StayTier,
  TransportFilter,
  TransportModeId,
  VIBES,
  WeatherFilter,
} from "@/lib/data";
import {
  agoLabel,
  bearing,
  budgetPP,
  buildHash,
  computeResults,
  createDefaults,
  evaluate,
  EvaluatedTrip,
  extrasLinks,
  fareKey,
  fareMonth,
  fmt,
  fmtK,
  fromSlider,
  greatCircle,
  hav,
  hrsLabel,
  itinerary,
  LiveFareData,
  LiveFareEntry,
  liveLinks,
  PlannerState,
  planText,
  readHash,
  stayLinks,
  toSlider,
  waUrl,
} from "@/lib/engine";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const BUDGET_PRESETS = [5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
const HERO_BUDGET_OPTIONS: [number, string][] = [
  [5000, "₹5,000"],
  [10000, "₹10,000"],
  [15000, "₹15,000"],
  [25000, "₹25,000"],
  [40000, "₹40,000"],
  [75000, "₹75,000"],
  [150000, "₹1.5 Lakh"],
  [300000, "₹3 Lakh"],
  [600000, "₹6 Lakh"],
];
const HERO_DAY_OPTIONS = [2, 3, 4, 5, 7, 10];

function tileUrls(theme: "light" | "dark"): string[] {
  const set = theme === "light" ? "light_all" : "dark_all";
  return ["a", "b", "c", "d"].map(
    (s) => `https://${s}.basemaps.cartocdn.com/${set}/{z}/{x}/{y}@2x.png`
  );
}

function skySpec(theme: "light" | "dark"): maplibregl.SkySpecification {
  return theme === "light"
    ? {
        "sky-color": "#dbeafe",
        "horizon-color": "#ffffff",
        "fog-color": "#eef2ff",
        "sky-horizon-blend": 0.6,
        "horizon-fog-blend": 0.6,
        "fog-ground-blend": 0.3,
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 6, 0],
      }
    : {
        "sky-color": "#05070c",
        "horizon-color": "#1a2438",
        "fog-color": "#07090e",
        "sky-horizon-blend": 0.5,
        "horizon-fog-blend": 0.8,
        "fog-ground-blend": 0.5,
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 0],
      };
}

function WhatsAppIcon() {
  return (
    <svg className="wa-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.5 14.2c-.2.6-1.3 1.2-1.8 1.3-.5.1-1.1.1-1.8-.1a16 16 0 0 1-6.2-4.2c-1.4-1.8-1.9-3.2-1.9-4.3 0-1.1.6-1.7.8-1.9.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5l-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.2.7-.1.3.1 1.7.8 2 1 .3.1.5.2.6.4.1.1.1.8-.1 1.4z" />
    </svg>
  );
}

export function SafarPlanner() {
  const defaultsRef = useRef<PlannerState>(createDefaults());
  const [baseDate, setBaseDate] = useState<Date>(() => new Date());
  const [state, setState] = useState<PlannerState>(() => createDefaults());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<Record<string, TransportModeId>>({});
  const [intro, setIntro] = useState<boolean>(true);
  const [heroLeaving, setHeroLeaving] = useState<boolean>(false);
  const [heroHidden, setHeroHidden] = useState<boolean>(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileTab, setMobileTab] = useState<"map" | "filters" | "trips">("trips");
  const [sheetMin, setSheetMin] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live flight fares state
  const [liveFares, setLiveFares] = useState<Record<string, LiveFareEntry>>({});
  const [cacheReady, setCacheReady] = useState<boolean>(false);
  const liveFaresRef = useRef<Record<string, LiveFareEntry>>({});
  const staticCacheRef = useRef<Record<string, LiveFareData>>({});

  // PWA install UI state
  const deferredInstallRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showInstallHero, setShowInstallHero] = useState<boolean>(false);
  const [showInstallChip, setShowInstallChip] = useState<boolean>(false);
  const [showIosSheet, setShowIosSheet] = useState<boolean>(false);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const resultsRef = useRef<EvaluatedTrip[]>([]);
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const planeMarkerRef = useRef<maplibregl.Marker | null>(null);
  const planeRafRef = useRef<number>(0);
  const spinningRef = useRef<boolean>(false);
  const introRef = useRef<boolean>(true);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const homeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);

  // Keep body overflow locked while planner is mounted
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);

  // Initialize theme, device flags, and URL hash on mount
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const iosDetected =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const mobile = window.matchMedia("(max-width: 860px)").matches;
    const dismissed = (() => {
      try {
        return localStorage.getItem("safar-a2hs-dismissed") === "1";
      } catch {
        return false;
      }
    })();

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setBaseDate(new Date());
      try {
        const saved = localStorage.getItem("safar-theme");
        const initialTheme = saved === "dark" ? "dark" : "light";
        setTheme(initialTheme);
        if (initialTheme === "light") {
          document.documentElement.setAttribute("data-theme", "light");
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
      } catch {
        setTheme("light");
      }

      if (iosDetected) setIsIOS(true);
      if (!standalone && mobile && iosDetected) {
        setShowInstallHero(true);
        if (!dismissed) setShowInstallChip(true);
      }

      // Parse initial URL hash (#trip=goa or #from=delhi&budget=10000&days=4)
      const parsed = readHash(window.location.hash, defaultsRef.current);
      if (parsed) {
        let nextPatch = { ...parsed.patch };
        if (parsed.trip && !parsed.patch.scope) {
          const target = DESTINATIONS.find((d) => d.id === parsed.trip);
          if (target?.intl) nextPatch = { ...nextPatch, scope: "all" };
        }
        setState((prev) => ({ ...prev, ...nextPatch }));
        if (parsed.trip) setSelectedId(parsed.trip);
        setIntro(false);
        setHeroHidden(true);
      }
    });

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredInstallRef.current = e as BeforeInstallPromptEvent;
      if (!standalone && mobile) {
        setShowInstallHero(true);
        if (!dismissed) setShowInstallChip(true);
      }
    };
    const onInstalled = () => {
      setShowInstallChip(false);
      setShowInstallHero(false);
      showToast("Safar added to your home screen 🎉");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const onHashChange = (e: HashChangeEvent) => {
      let rawHash = window.location.hash;
      if (e?.newURL) {
        try {
          rawHash = new URL(e.newURL).hash;
        } catch {}
      }
      if (window.location.hash !== rawHash) {
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname + window.location.search + rawHash
        );
      }
      const nextParsed = readHash(rawHash, defaultsRef.current);
      if (nextParsed) {
        let nextPatch = { ...nextParsed.patch };
        if (nextParsed.trip && !nextParsed.patch.scope) {
          const target = DESTINATIONS.find((d) => d.id === nextParsed.trip);
          if (target?.intl) nextPatch = { ...nextPatch, scope: "all" };
        }
        setModeOverride({});
        setState({ ...defaultsRef.current, ...nextPatch });
        setSelectedId(nextParsed.trip ?? null);
        setIntro(false);
        setHeroHidden(true);
      } else if (!introRef.current) {
        setModeOverride({});
        setState({ ...defaultsRef.current });
        setSelectedId(null);
      }
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [showToast]);

  // Load build-time fares-cache.json once so static deployments have real flight prices even without CORS
  useEffect(() => {
    let cancelled = false;
    fetch(withBasePath("/fares-cache.json"))
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.fares) return;
        staticCacheRef.current = payload.fares;
        // Trigger re-evaluation for any routes currently waiting or missing
        setLiveFares((prev) => {
          const updated = { ...prev };
          let changed = false;
          for (const [k, fareData] of Object.entries(
            payload.fares as Record<string, LiveFareData>
          )) {
            if (!updated[k] || updated[k].status === "none" || updated[k].status === "error") {
              updated[k] = fareData?.found
                ? { status: "ok", data: fareData }
                : { status: "none" };
              changed = true;
            }
          }
          if (changed) {
            liveFaresRef.current = updated;
            return updated;
          }
          return prev;
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCacheReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync URL hash when planner is active (past intro)
  useEffect(() => {
    if (intro) return;
    const hash = buildHash(state, defaultsRef.current, selectedId);
    if (window.location.hash === hash) return;
    const targetUrl = window.location.pathname + window.location.search + hash;
    window.history.replaceState(window.history.state, "", targetUrl);
  }, [state, selectedId, intro]);

  // Fetch live flight fares for current (from, month)
  useEffect(() => {
    const isLocalDev = process.env.NODE_ENV === "development";
    const hasLiveEndpoint = isLocalDev || Boolean(FARE_API);
    if (!hasLiveEndpoint && !cacheReady) return;

    const o = ORIGINS.find((x) => x.id === state.from) || ORIGINS[0];
    const fromCode = IATA[state.from];
    if (!fromCode) return;
    const monthStr = fareMonth(state.month);

    const targets: { key: string; toCode: string }[] = [];
    for (const d of DESTINATIONS) {
      const toCode = IATA[d.id];
      if (!toCode || toCode === fromCode) continue;
      if (hav(o, d) < 250) continue;
      const key = fareKey(state.from, d.id, state.month);
      if (!key || liveFaresRef.current[key]) continue;
      targets.push({ key, toCode });
    }

    if (!targets.length) return;

    const resolveFromStaticCache = (key: string, toCode: string): LiveFareEntry => {
      const exact = staticCacheRef.current[key];
      const routePrefix = `${fromCode}-${toCode}-`;
      const routeMatch =
        exact ||
        Object.entries(staticCacheRef.current).find(([k]) =>
          k.startsWith(routePrefix)
        )?.[1];
      return routeMatch && routeMatch.found
        ? { status: "ok", data: routeMatch }
        : { status: "none" };
    };

    if (!hasLiveEndpoint) {
      const resolvedBatch: Record<string, LiveFareEntry> = {};
      for (const { key, toCode } of targets) {
        resolvedBatch[key] = resolveFromStaticCache(key, toCode);
      }
      liveFaresRef.current = { ...liveFaresRef.current, ...resolvedBatch };
      queueMicrotask(() => {
        setLiveFares((prev) => ({ ...prev, ...resolvedBatch }));
      });
      return;
    }

    for (const t of targets) {
      liveFaresRef.current[t.key] = { status: "loading" };
    }

    for (const { key, toCode } of targets) {
      const endpoint = isLocalDev
        ? `${withBasePath("/api/fare")}?from=${fromCode}&to=${toCode}&month=${monthStr}`
        : `${FARE_API}/api/fare?from=${fromCode}&to=${toCode}&month=${monthStr}`;

      fetch(endpoint)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: LiveFareData) => {
          const entry: LiveFareEntry =
            data && data.found ? { status: "ok", data } : { status: "none" };
          liveFaresRef.current = { ...liveFaresRef.current, [key]: entry };
          setLiveFares((prev) => ({ ...prev, [key]: entry }));
        })
        .catch(() => {
          const entry = resolveFromStaticCache(key, toCode);
          liveFaresRef.current = { ...liveFaresRef.current, [key]: entry };
          setLiveFares((prev) => ({ ...prev, [key]: entry }));
        });
    }
  }, [state.from, state.month, cacheReady]);

  // Compute evaluated results & selected trip
  const { results, stats } = useMemo(
    () => computeResults(state, liveFares, modeOverride),
    [state, liveFares, modeOverride]
  );

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    introRef.current = intro;
  }, [intro]);

  const selectedTrip: EvaluatedTrip | null = useMemo(() => {
    if (!selectedId) return null;
    const found = results.find((r) => r.d.id === selectedId);
    if (found) return found;
    const rawDest = DESTINATIONS.find((d) => d.id === selectedId);
    return rawDest ? evaluate(rawDest, state, liveFares, modeOverride) : null;
  }, [selectedId, results, state, liveFares, modeOverride]);

  const currentOrigin = useMemo(
    () => ORIGINS.find((o) => o.id === state.from) || ORIGINS[0],
    [state.from]
  );

  // ---------------- Map helpers ----------------
  const stopSpin = useCallback(() => {
    spinningRef.current = false;
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
  }, []);

  const startSpin = useCallback(() => {
    if (!introRef.current || !mapRef.current || spinningRef.current) return;
    spinningRef.current = true;
    const tick = () => {
      if (!spinningRef.current || !introRef.current || !mapRef.current) {
        spinningRef.current = false;
        return;
      }
      const c = mapRef.current.getCenter();
      mapRef.current.easeTo({
        center: [c.lng + 3, c.lat],
        duration: 1000,
        easing: (t) => t,
      });
      spinTimerRef.current = setTimeout(tick, 1000);
    };
    tick();
  }, []);

  const frameIntro = useCallback((duration = 0) => {
    const map = mapRef.current;
    if (!map) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const wide = w >= 1000;
    const padding = wide
      ? { left: Math.round(w * 0.44), right: 20, top: 20, bottom: 20 }
      : { top: 50, bottom: Math.round(h * 0.5), left: 0, right: 0 };
    const zoom = wide ? 1.85 : w < 500 ? 1.05 : 1.35;
    map.easeTo({ center: [78, 18], zoom, pitch: 0, bearing: 0, padding, duration });
  }, []);

  const clearPlane = useCallback(() => {
    cancelAnimationFrame(planeRafRef.current);
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
    const map = mapRef.current;
    if (map && mapReadyRef.current) {
      const src = map.getSource("active") as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: "FeatureCollection", features: [] });
    }
  }, []);

  const fitAll = useCallback(
    (list: EvaluatedTrip[], orig: { lat: number; lng: number }) => {
      const map = mapRef.current;
      if (!map || !mapReadyRef.current) return;
      const pts: [number, number][] = [
        [orig.lng, orig.lat],
        ...list.slice(0, 12).map((r): [number, number] => [r.d.lng, r.d.lat]),
      ];
      if (pts.length < 2) {
        map.flyTo({ center: [orig.lng, orig.lat], zoom: 5 });
        return;
      }
      const b = pts.reduce(
        (acc, p) => acc.extend(p),
        new maplibregl.LngLatBounds(pts[0], pts[0])
      );
      const mob = window.innerWidth <= 860;
      map.fitBounds(b, {
        padding: mob
          ? 50
          : { top: 90, bottom: 50, left: 370, right: 440 },
        maxZoom: 6,
        duration: 1400,
      });
    },
    []
  );

  const flyRoute = useCallback(
    (orig: { lat: number; lng: number }, dest: { lat: number; lng: number }) => {
      const map = mapRef.current;
      if (!map || !mapReadyRef.current) return;
      const b = new maplibregl.LngLatBounds(
        [orig.lng, orig.lat],
        [orig.lng, orig.lat]
      ).extend([dest.lng, dest.lat]);
      const mob = window.innerWidth <= 860;
      map.fitBounds(b, {
        padding: mob
          ? 60
          : { top: 110, bottom: 90, left: 390, right: 450 },
        maxZoom: 6.5,
        pitch: 28,
        duration: 1300,
      });
    },
    []
  );

  const animateArc = useCallback(
    (orig: { lat: number; lng: number }, dest: { lat: number; lng: number }) => {
      clearPlane();
      const map = mapRef.current;
      if (!map || !mapReadyRef.current) return;
      const pts = greatCircle([orig.lng, orig.lat], [dest.lng, dest.lat], 110);
      const el = document.createElement("div");
      el.className = "plane";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "#ffffff");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute(
        "d",
        "M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
      );
      svg.appendChild(path);
      el.appendChild(svg);

      const marker = new maplibregl.Marker({
        element: el,
        rotationAlignment: "map",
      })
        .setLngLat(pts[0])
        .addTo(map);
      planeMarkerRef.current = marker;

      const t0 = performance.now();
      const dur = 1100;
      const step = (now: number) => {
        if (!mapRef.current) return;
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        const idx = Math.max(1, Math.round(e * (pts.length - 1)));
        const src = mapRef.current.getSource("active") as
          | maplibregl.GeoJSONSource
          | undefined;
        src?.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: pts.slice(0, idx + 1) },
            },
          ],
        });
        const a = pts[Math.max(0, idx - 1)];
        const b = pts[idx];
        marker.setLngLat(b);
        svg.style.transform = `rotate(${bearing(a, b)}deg)`;
        if (t < 1) {
          planeRafRef.current = requestAnimationFrame(step);
        }
      };
      planeRafRef.current = requestAnimationFrame(step);
    },
    [clearPlane]
  );

  // Initialize MapLibre 3D globe once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialTheme =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";

    let map: maplibregl.Map;
    try {
      maplibregl.setWorkerUrl(withBasePath("/maplibre-gl-worker.js"));
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          projection: { type: "globe" },
          sources: {
            carto: {
              type: "raster",
              tiles: tileUrls(initialTheme),
              tileSize: 256,
              attribution: "© OpenStreetMap · © CARTO",
            },
          },
          layers: [{ id: "basemap", type: "raster", source: "carto" }],
        },
        center: [78, 21],
        zoom: 1.7,
        pitch: 0,
        attributionControl: false,
      });
    } catch {
      // Graceful fallback when WebGL is unavailable in headless/old environments
      return;
    }

    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "bottom-left"
    );

    map.on("load", () => {
      mapReadyRef.current = true;
      const curTheme =
        document.documentElement.getAttribute("data-theme") === "light"
          ? "light"
          : "dark";
      try {
        map.setSky(skySpec(curTheme));
      } catch {}

      map.addSource("borders", {
        type: "geojson",
        data: withBasePath("/borders.geojson"),
      });
      map.addLayer({
        id: "borders-casing",
        type: "line",
        source: "borders",
        paint: {
          "line-color": curTheme === "light" ? "#eef1f5" : "#0b0e16",
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 2.5, 5, 5],
        },
      });
      map.addLayer({
        id: "borders-line",
        type: "line",
        source: "borders",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "ADM0_A3"], "IND"],
            curTheme === "light" ? "#f97316" : "#ff9d4d",
            curTheme === "light" ? "#cbd5e1" : "#525b6e",
          ],
          "line-width": [
            "case",
            ["==", ["get", "ADM0_A3"], "IND"],
            1.4,
            0.8,
          ],
          "line-opacity": curTheme === "light" ? 0.65 : 0.75,
        },
      });

      map.addSource("arcs", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("active", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "arcs-glow",
        type: "line",
        source: "arcs",
        paint: {
          "line-color": "#ff7a1a",
          "line-width": 5,
          "line-opacity": 0.14,
          "line-blur": 4,
        },
      });
      map.addLayer({
        id: "arcs-line",
        type: "line",
        source: "arcs",
        paint: {
          "line-color": ["case", ["get", "within"], "#ff9d4d", "#fbbf24"],
          "line-width": 1.4,
          "line-opacity": 0.55,
        },
      });
      map.addLayer({
        id: "active-glow",
        type: "line",
        source: "active",
        paint: {
          "line-color": "#ff7a1a",
          "line-width": 10,
          "line-opacity": 0.35,
          "line-blur": 6,
        },
      });
      map.addLayer({
        id: "active-line",
        type: "line",
        source: "active",
        paint: {
          "line-color": "#ff7a1a",
          "line-width": 2.8,
          "line-dasharray": [2, 1.5],
        },
      });

      setMapLoaded(true);
      if (introRef.current && (!window.location.hash || window.location.hash.length < 2)) {
        frameIntro(0);
        startSpin();
      }
    });

    const onUserInteract = () => stopSpin();
    map.on("mousedown", onUserInteract);
    map.on("touchstart", onUserInteract);
    map.on("wheel", onUserInteract);

    // On touch screens, CSS sets pointer-events: none on .pin so pinch/drag gestures pass through;
    // tapping the map selects the nearest projected pin within 34px.
    const touchOnly = window.matchMedia("(hover: none)").matches;
    map.on("click", (e) => {
      if (!touchOnly || !resultsRef.current.length) return;
      let best: EvaluatedTrip | null = null;
      let bestD = 34;
      for (const r of resultsRef.current.slice(0, 24)) {
        const p = map.project([r.d.lng, r.d.lat]);
        const dist = Math.hypot(p.x - e.point.x, p.y - 14 - e.point.y);
        if (dist < bestD) {
          bestD = dist;
          best = r;
        }
      }
      if (best) {
        setSelectedId(best.d.id);
        setMobileTab("trips");
        setSheetMin(false);
      }
    });

    const ro = new ResizeObserver(() => {
      map.resize();
      if (introRef.current) frameIntro(0);
    });
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      stopSpin();
      cancelAnimationFrame(planeRafRef.current);
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [frameIntro, startSpin, stopSpin]);

  // Resize & re-fit map smoothly when mobile tab or sheet state changes
  useEffect(() => {
    if (intro) return;
    const t = setTimeout(() => {
      mapRef.current?.resize();
      if (mobileTab === "map" && !selectedId) {
        fitAll(resultsRef.current, currentOrigin);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [mobileTab, sheetMin, intro, selectedId, currentOrigin, fitAll]);
  useEffect(() => {
    const onResize = () => {
      if (intro) frameIntro(0);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [intro, frameIntro]);

  // Sync map raster tiles + sky + border colors when theme toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    try {
      const firstLayer = map.getStyle().layers?.find((l) => l.id !== "basemap")?.id;
      if (map.getLayer("basemap")) map.removeLayer("basemap");
      if (map.getSource("carto")) map.removeSource("carto");
      map.addSource("carto", {
        type: "raster",
        tiles: tileUrls(theme),
        tileSize: 256,
        attribution: "© OpenStreetMap · © CARTO",
      });
      map.addLayer({ id: "basemap", type: "raster", source: "carto" }, firstLayer);
      map.setSky(skySpec(theme));
      if (map.getLayer("borders-casing")) {
        map.setPaintProperty(
          "borders-casing",
          "line-color",
          theme === "light" ? "#eef1f5" : "#0b0e16"
        );
      }
      if (map.getLayer("borders-line")) {
        map.setPaintProperty("borders-line", "line-color", [
          "case",
          ["==", ["get", "ADM0_A3"], "IND"],
          theme === "light" ? "#f97316" : "#ff9d4d",
          theme === "light" ? "#cbd5e1" : "#525b6e",
        ]);
        map.setPaintProperty(
          "borders-line",
          "line-opacity",
          theme === "light" ? 0.65 : 0.75
        );
      }
    } catch {}
  }, [theme, mapLoaded]);

  // Sync map arcs, pins, origin marker, and route camera whenever results / selection / intro changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    // Clear old markers
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }

    if (intro) {
      const arcsSrc = map.getSource("arcs") as maplibregl.GeoJSONSource | undefined;
      arcsSrc?.setData({ type: "FeatureCollection", features: [] });
      clearPlane();
      return;
    }

    // Origin pin
    const oe = document.createElement("div");
    oe.className = "origin-pin";
    const ol = document.createElement("span");
    ol.className = "origin-label";
    ol.textContent = currentOrigin.name;
    oe.appendChild(ol);
    originMarkerRef.current = new maplibregl.Marker({ element: oe, anchor: "center" })
      .setLngLat([currentOrigin.lng, currentOrigin.lat])
      .addTo(map);

    const topResults = results.slice(0, 24);

    // Arcs GeoJSON
    const features = topResults.map((r) => ({
      type: "Feature" as const,
      properties: { id: r.d.id, within: r.within },
      geometry: {
        type: "LineString" as const,
        coordinates: greatCircle(
          [currentOrigin.lng, currentOrigin.lat],
          [r.d.lng, r.d.lat],
          72
        ),
      },
    }));
    const arcsSrc = map.getSource("arcs") as maplibregl.GeoJSONSource | undefined;
    arcsSrc?.setData({ type: "FeatureCollection", features });

    // Destination pins (inner .pin child keeps CSS keyframe/hover transforms off MapLibre's outer marker wrapper)
    topResults.forEach((r, i) => {
      const el = document.createElement("div");
      el.dataset.destId = r.d.id;
      const pin = document.createElement("div");
      pin.className = `pin ${r.within ? "within" : "over"}${selectedId === r.d.id ? " active" : ""}`;
      pin.style.animationDelay = `${Math.min(i * 35, 500)}ms`;
      const em = document.createElement("span");
      em.className = "e";
      em.textContent = r.d.emoji;
      const nm = document.createElement("span");
      nm.textContent = r.d.name.split(" ")[0];
      const pr = document.createElement("span");
      pr.textContent = `· ${fmtK(r.cost.total)}`;
      pin.append(em, nm, pr);
      el.appendChild(pin);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setSelectedId(r.d.id);
        setMobileTab("trips");
        setSheetMin(false);
      });
      const mk = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
        offset: [0, -4],
      })
        .setLngLat([r.d.lng, r.d.lat])
        .addTo(map);
      markersRef.current.push(mk);
    });

    if (selectedTrip) {
      flyRoute(currentOrigin, selectedTrip.d);
      animateArc(currentOrigin, selectedTrip.d);
    } else {
      clearPlane();
      fitAll(results, currentOrigin);
    }
  }, [
    mapLoaded,
    intro,
    results,
    selectedId,
    selectedTrip,
    currentOrigin,
    clearPlane,
    fitAll,
    flyRoute,
    animateArc,
  ]);

  // Resize map when mobile tab or sheet state changes
  useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.resize();
    }, 60);
    return () => clearTimeout(t);
  }, [mobileTab, sheetMin, intro]);

  // Scroll detail panel to top when selecting a new destination
  useEffect(() => {
    if (selectedId && detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0;
    }
  }, [selectedId]);

  // ---------------- Interactive handlers ----------------
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("safar-theme", next);
    } catch {}
  };

  const handleStart = () => {
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
    if (homeTimerRef.current) clearTimeout(homeTimerRef.current);
    stopSpin();
    mapRef.current?.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    setHeroLeaving(true);
    setIntro(false);
    setMobileTab("trips");
    setSheetMin(false);
    heroTimerRef.current = setTimeout(() => {
      setHeroHidden(true);
      setHeroLeaving(false);
    }, 550);
  };

  const handleGoHome = (e: React.MouseEvent) => {
    e.preventDefault();
    if (intro) return;
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
    if (homeTimerRef.current) clearTimeout(homeTimerRef.current);
    clearPlane();
    setSelectedId(null);
    setSheetMin(false);
    setMobileTab("trips");
    setHeroHidden(false);
    setHeroLeaving(false);
    setIntro(true);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
    homeTimerRef.current = setTimeout(() => {
      mapRef.current?.resize();
      frameIntro(900);
      homeTimerRef.current = setTimeout(startSpin, 950);
    }, 20);
  };

  const handleReset = () => {
    const fresh = createDefaults();
    defaultsRef.current = fresh;
    setState(fresh);
    setModeOverride({});
    setSelectedId(null);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  };

  const adjustDays = (delta: number) => {
    setState((prev) => ({
      ...prev,
      days: Math.max(1, Math.min(15, prev.days + delta)),
    }));
  };

  const adjustTravelers = (delta: number) => {
    setState((prev) => {
      const v = Math.max(1, Math.min(20, prev.travelers + delta));
      let group = prev.group;
      if (v === 1) group = "solo";
      else if (group === "solo") group = v === 2 ? "couple" : "friends";
      return { ...prev, travelers: v, group };
    });
  };

  const handleGroupChange = (g: GroupType) => {
    setState((prev) => {
      let travelers = prev.travelers;
      if (g === "solo") travelers = 1;
      else if (g === "couple") travelers = 2;
      else if ((g === "friends" || g === "family") && travelers < 3) travelers = 4;
      return { ...prev, group: g, travelers };
    });
  };

  const toggleVibe = (id: string) => {
    setState((prev) => ({
      ...prev,
      vibes: prev.vibes.includes(id)
        ? prev.vibes.filter((v) => v !== id)
        : [...prev.vibes, id],
    }));
  };

  const highlightPin = useCallback(
    (hoverId: string | null) => {
      for (const mk of markersRef.current) {
        const el = mk.getElement();
        const id = el.dataset.destId;
        const pin = el.querySelector(".pin");
        pin?.classList.toggle("active", id === hoverId || id === selectedId);
      }
    },
    [selectedId]
  );

  const handleSurprise = () => {
    if (!results.length) {
      showToast("No trips match. Loosen a filter first 🙂");
      return;
    }
    const pool = results.slice(0, Math.min(8, results.length));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSelectedId(pick.d.id);
    setMobileTab("trips");
    setSheetMin(false);
  };

  const handleInstallPrompt = async () => {
    if (deferredInstallRef.current) {
      await deferredInstallRef.current.prompt();
      const { outcome } = await deferredInstallRef.current.userChoice;
      deferredInstallRef.current = null;
      if (outcome === "accepted") {
        setShowInstallChip(false);
        setShowInstallHero(false);
      }
    } else if (isIOS) {
      setShowIosSheet(true);
    } else {
      window.location.href = withBasePath("/app/");
    }
  };

  const dismissInstallChip = () => {
    setShowInstallChip(false);
    try {
      localStorage.setItem("safar-a2hs-dismissed", "1");
    } catch {}
  };

  const copyShare = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(label);
    } catch {
      showToast("Copy link from your address bar");
    }
  };

  // Share URLs
  const appBaseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${withBasePath("/")}`
      : `${SITE_URL}${withBasePath("/")}`;

  const currentShareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `${SITE_URL}${withBasePath("/")}`;

  const heroWaHref = useMemo(
    () =>
      waUrl(
        `Check out *Safar*: set your budget, days and starting city, and it shows every trip you can actually afford in India & abroad (flights, trains, stay, food and a day-by-day plan).\n\nTry it free: ${appBaseUrl}`
      ),
    [appBaseUrl]
  );

  const listWaHref = useMemo(() => {
    const top = results
      .slice(0, 5)
      .map((r) => `• ${r.d.name}: ${fmt(r.cost.total)}/person`)
      .join("\n");
    const msg = results.length
      ? `${results.length} trips from ${currentOrigin.name} under ${fmt(budgetPP(state))}/person (${state.days} days in ${MONTHS[state.month - 1]}):\n\n${top}\n\nSee all & customise ⬇\n${currentShareUrl}`
      : `Plan a trip in your budget on *Safar*:\n${appBaseUrl}`;
    return waUrl(msg);
  }, [results, currentOrigin.name, state, currentShareUrl, appBaseUrl]);

  const bpp = budgetPP(state);
  const bumpTarget =
    stats.budget > 0 && Number.isFinite(stats.cheapestHidden)
      ? Math.ceil((stats.cheapestHidden * (state.budgetMode === "total" ? state.travelers : 1)) / 500) * 500
      : null;

  const plannerClass = [
    "safar-planner",
    intro ? "intro" : "",
    !intro && mobileTab === "map" ? "map-full" : "",
    !intro && sheetMin ? "sheet-min" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={plannerClass}>
      <div id="map" ref={mapContainerRef} aria-label="Interactive destination globe" />

      {/* Top Brand */}
      <a
        className="brand glass"
        id="homeBtn"
        href={withBasePath("/")}
        onClick={handleGoHome}
        title="Back to home"
      >
        <div className="logo">✈︎</div>
        <div>
          <div className="brand-name">Safar</div>
          <div className="brand-tag">Smart Trip Planner</div>
        </div>
      </a>

      {/* Top-right Guides & Theme Controls */}
      <Link
        className="guides-btn glass"
        href="/guides/"
        title="Destination guides & itineraries"
      >
        <span className="ico">📖</span>
        <span className="lbl">Travel guides</span>
      </Link>

      <button
        className="theme-btn glass"
        id="themeBtn"
        type="button"
        onClick={toggleTheme}
        title={theme === "light" ? "Switch to night mode" : "Switch to day mode"}
        aria-label={theme === "light" ? "Switch to night mode" : "Switch to day mode"}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      {/* Intro Hero */}
      {!heroHidden && (
        <section
          id="hero"
          className={`hero${heroLeaving ? " leaving" : ""}`}
        >
          <p className="eyebrow">✨ Tell us your budget. We’ll plan the rest</p>
          <h1>
            Where can you <span className="grad">actually</span> go?
          </h1>
          <p className="sub">
            Real transport + stay + food + local travel costs for 40+ places in India
            &amp; abroad, tailored to your city, group and dates.
          </p>
          <div className="hero-quick">
            <label>
              <span>Starting from</span>
              <select
                id="heroFrom"
                value={state.from}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, from: e.target.value }))
                }
              >
                {ORIGINS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Budget / person</span>
              <select
                id="heroBudget"
                value={
                  HERO_BUDGET_OPTIONS.some(([v]) => v === state.budget)
                    ? state.budget
                    : 15000
                }
                onChange={(e) =>
                  setState((prev) => ({ ...prev, budget: Number(e.target.value) }))
                }
              >
                {HERO_BUDGET_OPTIONS.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Days</span>
              <select
                id="heroDays"
                value={
                  HERO_DAY_OPTIONS.includes(state.days) ? state.days : 4
                }
                onChange={(e) =>
                  setState((prev) => ({ ...prev, days: Number(e.target.value) }))
                }
              >
                {HERO_DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={`hero-actions${isIOS ? " three" : ""}`}>
            <button
              id="startBtn"
              type="button"
              className="btn-primary big"
              onClick={handleStart}
            >
              Find my trips →
            </button>
            {!isIOS && (
              <Link id="apkHero" className="btn-app" href="/app/">
                <span className="ico">🤖</span>
                <span>Get Android app</span>
              </Link>
            )}
            <a
              id="waHero"
              className="wa-btn"
              href={heroWaHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon />
              <span>Share on WhatsApp</span>
            </a>
            <Link id="ideasHero" className="btn-app" href="/guides/">
              <span className="ico">📖</span>
              <span>Trip ideas</span>
            </Link>
          </div>
          {showInstallHero && (
            <button
              id="installHero"
              type="button"
              className="install-link"
              onClick={handleInstallPrompt}
            >
              📲 Add Safar to your home screen
            </button>
          )}
        </section>
      )}

      {/* Left Panel: Filters */}
      <aside
        id="filtersPanel"
        className={`panel panel-left glass${mobileTab === "filters" ? " show" : ""}`}
        aria-label="Trip filters"
      >
        <button
          className="sheet-toggle"
          type="button"
          aria-label="Minimise panel to see map"
          onClick={() => setSheetMin((v) => !v)}
        >
          <i />
          <span className="st-hide">Map ▲</span>
          <span className="st-show">▲ Show filters &amp; trips</span>
        </button>
        <div className="panel-head">
          <h2>Your trip</h2>
          <button id="resetBtn" type="button" className="link" onClick={handleReset}>
            Reset
          </button>
        </div>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="fromSelect">Starting city</label>
            <select
              id="fromSelect"
              value={state.from}
              onChange={(e) => {
                setModeOverride({});
                setState((prev) => ({ ...prev, from: e.target.value }));
              }}
            >
              {ORIGINS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <div className="row-between">
              <label htmlFor="budgetRange">Budget</label>
              <div className="seg seg-sm" role="tablist">
                <button
                  type="button"
                  className={state.budgetMode === "pp" ? "on" : ""}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      budget:
                        prev.budgetMode === "total"
                          ? Math.round(prev.budget / prev.travelers / 500) * 500
                          : prev.budget,
                      budgetMode: "pp",
                    }))
                  }
                >
                  Per person
                </button>
                <button
                  type="button"
                  className={state.budgetMode === "total" ? "on" : ""}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      budget:
                        prev.budgetMode === "pp"
                          ? prev.budget * prev.travelers
                          : prev.budget,
                      budgetMode: "total",
                    }))
                  }
                >
                  Total group
                </button>
              </div>
            </div>
            <div className="big-value" id="budgetLabel">
              {fmt(state.budget)}
            </div>
            <input
              id="budgetRange"
              type="range"
              min={0}
              max={100}
              step={1}
              value={toSlider(state.budget)}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  budget: fromSlider(Number(e.target.value)),
                }))
              }
            />
            <div className="muted small" id="budgetSub">
              {state.budgetMode === "pp"
                ? `${fmt(state.budget * state.travelers)} total for ${state.travelers} ${state.travelers === 1 ? "traveller" : "travellers"}`
                : `${fmt(bpp)} per person`}
            </div>
            <div className="chips tiny" id="budgetPresets">
              {BUDGET_PRESETS.map((v) => {
                const target =
                  state.budgetMode === "total" ? v * state.travelers : v;
                const active = Math.abs(bpp - v) < 400;
                return (
                  <button
                    key={v}
                    type="button"
                    className={`chip${active ? " on" : ""}`}
                    onClick={() =>
                      setState((prev) => ({ ...prev, budget: target }))
                    }
                  >
                    {fmtK(v)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label>Days</label>
              <div className="stepper">
                <button
                  type="button"
                  aria-label="Fewer days"
                  onClick={() => adjustDays(-1)}
                >
                  −
                </button>
                <span id="daysVal">{state.days}</span>
                <button
                  type="button"
                  aria-label="More days"
                  onClick={() => adjustDays(1)}
                >
                  +
                </button>
              </div>
            </div>
            <div className="field">
              <label>Travellers</label>
              <div className="stepper">
                <button
                  type="button"
                  aria-label="Fewer travellers"
                  onClick={() => adjustTravelers(-1)}
                >
                  −
                </button>
                <span id="travVal">{state.travelers}</span>
                <button
                  type="button"
                  aria-label="More travellers"
                  onClick={() => adjustTravelers(1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="monthSelect">When are you going?</label>
            <select
              id="monthSelect"
              value={state.month}
              onChange={(e) =>
                setState((prev) => ({ ...prev, month: Number(e.target.value) }))
              }
            >
              {Array.from({ length: 12 }, (_, i) => {
                const m = ((baseDate.getMonth() + i) % 12) + 1;
                const y =
                  baseDate.getFullYear() +
                  (baseDate.getMonth() + i >= 12 ? 1 : 0);
                const suffix =
                  i === 0 ? " (this month)" : i === 1 ? " (next month)" : "";
                return (
                  <option key={m} value={m}>
                    {`${MONTHS[m - 1]} ${y}${suffix}`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="field">
            <label>Travelling as</label>
            <div className="seg" id="groupSeg">
              {(
                [
                  ["solo", "Solo"],
                  ["couple", "Couple"],
                  ["friends", "Friends"],
                  ["family", "Family"],
                ] as [GroupType, string][]
              ).map(([g, label]) => (
                <button
                  key={g}
                  type="button"
                  className={state.group === g ? "on" : ""}
                  onClick={() => handleGroupChange(g)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>
              What’s your vibe? <span className="muted">(any)</span>
            </label>
            <div className="chips" id="vibeChips">
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`chip${state.vibes.includes(v.id) ? " on" : ""}`}
                  onClick={() => toggleVibe(v.id)}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Where</label>
            <div className="seg" id="scopeSeg">
              {(
                [
                  ["india", "🇮🇳 India"],
                  ["all", "🇮🇳 + 🌏 Both"],
                  ["intl", "🌏 Abroad"],
                ] as [ScopeType, string][]
              ).map(([sc, label]) => (
                <button
                  key={sc}
                  type="button"
                  className={state.scope === sc ? "on" : ""}
                  onClick={() => setState((prev) => ({ ...prev, scope: sc }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Stay comfort</label>
            <div className="seg" id="staySeg">
              {(
                [
                  ["hostel", "Hostel"],
                  ["budget", "Budget"],
                  ["mid", "3★–4★"],
                  ["luxury", "Luxury"],
                ] as [StayTier, string][]
              ).map(([st, label]) => (
                <button
                  key={st}
                  type="button"
                  className={state.stay === st ? "on" : ""}
                  onClick={() => setState((prev) => ({ ...prev, stay: st }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Preferred transport</label>
            <div className="seg" id="transSeg">
              {(
                [
                  ["any", "Best"],
                  ["flight", "✈️ Fly"],
                  ["train", "🚆 Train"],
                  ["bus", "🚌 Bus"],
                  ["car", "🚗 Drive"],
                ] as [TransportFilter, string][]
              ).map(([tr, label]) => (
                <button
                  key={tr}
                  type="button"
                  className={state.transport === tr ? "on" : ""}
                  onClick={() => {
                    setModeOverride({});
                    setState((prev) => ({ ...prev, transport: tr }));
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label htmlFor="maxHrs">Max travel time (one way)</label>
              <select
                id="maxHrs"
                value={state.maxTravel}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    maxTravel: Number(e.target.value),
                  }))
                }
              >
                <option value={4}>Up to 4 hrs</option>
                <option value={8}>Up to 8 hrs</option>
                <option value={12}>Up to 12 hrs</option>
                <option value={24}>Up to 24 hrs</option>
                <option value={99}>Any</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="weatherSel">Weather</label>
              <select
                id="weatherSel"
                value={state.weather}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    weather: e.target.value as WeatherFilter,
                  }))
                }
              >
                <option value="any">Any</option>
                <option value="cold">❄️ Cool / cold</option>
                <option value="pleasant">🌤️ Mild &amp; pleasant</option>
                <option value="warm">☀️ Warm / beach</option>
              </select>
            </div>
          </div>

          <div className="field toggles">
            <label className="toggle">
              <input
                type="checkbox"
                id="togSeason"
                checked={state.hideOff}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, hideOff: e.target.checked }))
                }
              />
              <span />
              Hide off-season places
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="togStretch"
                checked={state.stretch}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, stretch: e.target.checked }))
                }
              />
              <span />
              Show slightly over budget (+20%)
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="togOffbeat"
                checked={state.offbeat}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, offbeat: e.target.checked }))
                }
              />
              <span />
              Offbeat / less crowded
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="togKids"
                checked={state.kids}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, kids: e.target.checked }))
                }
              />
              <span />
              Good with kids
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="togSeniors"
                checked={state.seniors}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, seniors: e.target.checked }))
                }
              />
              <span />
              Easy for elders (less walking)
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="togNoPass"
                checked={state.nopass}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, nopass: e.target.checked }))
                }
              />
              <span />
              Easy visa / no passport needed
            </label>
          </div>
        </div>
      </aside>

      {/* Right Panel: Results & Detail */}
      <aside
        id="resultsPanel"
        className={`panel panel-right glass${mobileTab === "trips" ? " show" : ""}`}
        aria-label="Recommended destinations"
      >
        <button
          className="sheet-toggle"
          type="button"
          aria-label="Minimise panel to see map"
          onClick={() => setSheetMin((v) => !v)}
        >
          <i />
          <span className="st-hide">Map ▲</span>
          <span className="st-show">▲ Show filters &amp; trips</span>
        </button>

        {!selectedTrip ? (
          <div id="listView">
            <div className="panel-head">
              <div>
                <h2 id="resultsTitle">
                  {results.length === 0
                    ? "No matches yet"
                    : `${results.length} ${results.length === 1 ? "trip fits" : "trips fit"}`}
                </h2>
                <p className="muted small" id="resultsSub">
                  from {currentOrigin.name} · {state.days}d ·{" "}
                  {MONTHS[state.month - 1]}
                </p>
              </div>
              <div className="head-actions">
                <a
                  id="shareListWa"
                  className="btn-ghost wa"
                  href={listWaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share these trips on WhatsApp"
                >
                  💬 Share
                </a>
                <button
                  id="surpriseBtn"
                  type="button"
                  className="btn-ghost"
                  title="Pick a random great trip"
                  onClick={handleSurprise}
                >
                  🎲 Surprise me
                </button>
              </div>
            </div>

            <div className="sortbar">
              <span className="muted small">Sort</span>
              <div className="seg seg-sm" id="sortSeg">
                {(
                  [
                    ["match", "Best match"],
                    ["cheap", "Cheapest"],
                    ["near", "Nearest"],
                    ["rating", "Top rated"],
                  ] as [SortType, string][]
                ).map(([s, label]) => (
                  <button
                    key={s}
                    type="button"
                    className={state.sort === s ? "on" : ""}
                    onClick={() => setState((prev) => ({ ...prev, sort: s }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div id="resultsList" className="panel-body">
              {results.length === 0 ? (
                <div className="empty">
                  <b>Nothing matches all of that</b>
                  {stats.budget > 0 && bumpTarget ? (
                    <>
                      {stats.budget} destinations need a slightly bigger budget (the
                      cheapest starts around {fmt(stats.cheapestHidden)} per person).
                      <div style={{ marginTop: 12 }}>
                        <button
                          className="btn-primary"
                          type="button"
                          onClick={() =>
                            setState((prev) => ({ ...prev, budget: bumpTarget }))
                          }
                        >
                          Set budget to {fmt(bumpTarget)}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      Try allowing longer travel time, switching transport to{" "}
                      <i>Best</i>, or turning off off-season hiding.
                    </>
                  )}
                </div>
              ) : (
                results.map((r, i) => {
                  const over = Math.round((r.ratio - 1) * 100);
                  const fk = fareKey(state.from, r.d.id, state.month);
                  const farePending = Boolean(
                    fk && r.opts.some((o) => o.mode === "flight") && !liveFares[fk]
                  );
                  return (
                    <div
                      key={r.d.id}
                      className={`card${selectedId === r.d.id ? " active" : ""}`}
                      style={{ animationDelay: `${Math.min(i * 30, 360)}ms` }}
                      onClick={() => setSelectedId(r.d.id)}
                      onMouseEnter={() => highlightPin(r.d.id)}
                      onMouseLeave={() => highlightPin(null)}
                    >
                      <div className="card-emoji">{r.d.emoji}</div>
                      <div className="card-main">
                        <div className="card-top">
                          <div className="card-name">{r.d.name}</div>
                          <div className="card-price">{fmt(r.cost.total)}</div>
                        </div>
                        <div className="card-sub">
                          <span>
                            {r.d.state}
                            {r.mode
                              ? ` · ~${hrsLabel(r.mode.hrs)} by ${r.mode.name}`
                              : ""}
                          </span>
                          <span>per person</span>
                        </div>
                        <div className="card-tags">
                          <span className="tag match">{r.score}% match</span>
                          <span className={`tag ${r.within ? "good" : "warn"}`}>
                            {r.within ? "In budget" : `+${over}% over`}
                          </span>
                          {r.season === "peak" && (
                            <span className="tag good">Peak season</span>
                          )}
                          {r.season === "off" && (
                            <span className="tag bad">Off-season</span>
                          )}
                          <span className="tag">
                            {r.wx.icon} {r.wx.label}
                          </span>
                          {r.mode?.live ? (
                            <span className="tag good">📡 Live flight fare</span>
                          ) : farePending ? (
                            <span className="tag">Checking live fares…</span>
                          ) : null}
                          {r.d.intl && r.d.visaEasy && (
                            <span className="tag">🛂 Visa-free / VOA</span>
                          )}
                          {r.d.offbeat && <span className="tag">Offbeat</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div id="detailView">
            <DetailView
              r={selectedTrip}
              state={state}
              resultsCount={results.length}
              liveFares={liveFares}
              scrollRef={detailScrollRef}
              shareHref={currentShareUrl}
              onBack={() => setSelectedId(null)}
              onPickMode={(m) =>
                setModeOverride((prev) => ({ ...prev, [selectedTrip.d.id]: m }))
              }
              onAdjustTravelers={adjustTravelers}
              onCopyPlan={(txt) => copyShare(txt, "Trip plan copied to clipboard")}
            />
          </div>
        )}
      </aside>

      {/* Mobile Bottom Tabbar */}
      <nav id="tabbar" className="tabbar glass" aria-label="View switcher">
        <button
          type="button"
          className={mobileTab === "map" ? "active" : ""}
          onClick={() => {
            setMobileTab("map");
            setSheetMin(false);
          }}
        >
          🗺️ Map
        </button>
        <button
          type="button"
          className={mobileTab === "filters" ? "active" : ""}
          onClick={() => {
            setMobileTab("filters");
            setSheetMin(false);
          }}
        >
          🎛️ Filters
        </button>
        <button
          type="button"
          className={mobileTab === "trips" ? "active" : ""}
          onClick={() => {
            setMobileTab("trips");
            setSheetMin(false);
          }}
        >
          ✨ Trips (<span id="tabCount">{results.length}</span>)
        </button>
      </nav>

      {/* Add-to-home-screen Banner */}
      {showInstallChip && (
        <div id="installChip" className="install-chip glass">
          <div className="logo sm">✈︎</div>
          <div className="ic-text">
            <b>Get the Safar app</b>
            <small id="installSub">
              {isIOS
                ? "Add to your iPhone home screen"
                : "One-tap access from your home screen"}
            </small>
          </div>
          {!isIOS && (
            <a
              id="apkChip"
              className="apk-mini"
              href={withBasePath("/downloads/safar-trip-planner.apk")}
              download
            >
              APK
            </a>
          )}
          <button
            id="installBtn"
            type="button"
            className="btn-primary sm"
            onClick={handleInstallPrompt}
          >
            {isIOS ? "How" : "Install"}
          </button>
          <button
            id="installClose"
            type="button"
            className="ic-close"
            aria-label="Dismiss"
            onClick={dismissInstallChip}
          >
            ✕
          </button>
        </div>
      )}

      {/* iOS Add to Home Screen Instructions */}
      {showIosSheet && (
        <div
          id="iosSheet"
          className="ios-sheet"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIosSheet(false);
          }}
        >
          <div className="ios-card glass">
            <b>Add Safar to your Home Screen</b>
            <ol>
              <li>
                Tap the <span className="kbd">Share</span> button{" "}
                <span className="share-ico">⬆︎</span> in Safari
              </li>
              <li>
                Scroll down and tap{" "}
                <span className="kbd">Add to Home Screen</span>
              </li>
              <li>
                Tap <span className="kbd">Add</span>
              </li>
            </ol>
            <button
              id="iosGot"
              type="button"
              className="btn-primary"
              onClick={() => setShowIosSheet(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div id="toast" className="toast">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

interface DetailViewProps {
  r: EvaluatedTrip;
  state: PlannerState;
  resultsCount: number;
  liveFares: Record<string, LiveFareEntry>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  shareHref: string;
  onBack: () => void;
  onPickMode: (m: TransportModeId) => void;
  onAdjustTravelers: (delta: number) => void;
  onCopyPlan: (txt: string) => void;
}

function DetailView({
  r,
  state,
  resultsCount,
  liveFares,
  scrollRef,
  shareHref,
  onBack,
  onPickMode,
  onAdjustTravelers,
  onCopyPlan,
}: DetailViewProps) {
  const { d, cost } = r;
  const n = state.travelers;
  const parts: [string, number, string][] = [
    ["Travel", cost.travel, "#ff7a1a"],
    [`Stay (${cost.nights}n)`, cost.stay, "#60a5fa"],
    ["Food", cost.food, "#34d399"],
    ["Local travel", cost.local, "#a78bfa"],
    ["Activities", cost.act, "#f472b6"],
    ["Buffer & visa", cost.misc, "#94a3b8"],
  ];

  const fk = fareKey(state.from, d.id, state.month);
  const lf = fk ? liveFares[fk] : undefined;
  const liveFlight = r.opts.find((o) => o.mode === "flight" && o.live)?.live;

  const daysPlan = useMemo(() => itinerary(r, state), [r, state]);
  const bookingLinks = useMemo(() => liveLinks(d, state), [d, state]);
  const stays = useMemo(() => stayLinks(d, state), [d, state]);
  const extras = useMemo(() => extrasLinks(d), [d]);
  const fullPlanText = useMemo(
    () => planText(r, state, shareHref),
    [r, state, shareHref]
  );

  return (
    <>
      <div className="detail-hero">
        <button className="back" type="button" id="backBtn" onClick={onBack}>
          ← All {resultsCount} destinations
        </button>
        <div className="detail-title">
          <div className="card-emoji">{d.emoji}</div>
          <div>
            <h2>{d.name}</h2>
            <p>
              {d.state} · ⭐ {d.rating} · {r.wx.icon} {r.wx.label} in{" "}
              {MONTHS[state.month - 1]} · {r.score}% match
            </p>
          </div>
        </div>
        <p className="desc">{d.desc}</p>
        <div className="price-row">
          <div className="price-box hl">
            <div className="lbl">Per person</div>
            <div className="val">{fmt(cost.total)}</div>
          </div>
          <div className="price-box">
            <div className="lbl">Group of {n}</div>
            <div className="val">{fmt(cost.total * n)}</div>
          </div>
          <div className="price-box">
            <div className="lbl">
              {cost.total - budgetPP(state) <= 0 ? "You save" : "Over budget"}
            </div>
            <div
              className="val"
              style={{
                color:
                  cost.total - budgetPP(state) <= 0
                    ? "var(--green)"
                    : "var(--amber)",
              }}
            >
              {fmt(Math.abs(cost.total - budgetPP(state)))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel-body" ref={scrollRef}>
        {r.flags.map((f, idx) => (
          <div key={idx} className={`flag ${f.t}`}>
            {f.m}
          </div>
        ))}

        <div className="section">
          <h3>Cost breakdown (per person)</h3>
          <div className="stack">
            {parts.map(([lbl, val, col]) => (
              <div
                key={lbl}
                style={{
                  flex: Math.max(0.02, val / cost.total),
                  background: col,
                }}
                title={`${lbl}: ${fmt(val)}`}
              />
            ))}
          </div>
          <div className="legend">
            {parts.map(([lbl, val, col]) => (
              <div key={lbl}>
                <i style={{ background: col }} />
                <span>{lbl}</span>
                <b>{fmt(val)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>How to get there (round trip / person)</h3>
          <div className="opts">
            {r.opts.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Too close to need long-distance travel.
              </p>
            ) : (
              r.opts.map((o) => {
                const badge = o.live ? (
                  <small style={{ color: "var(--green)" }}>
                    📡 Live{o.live.airline ? ` · ${o.live.airline}` : ""} ·{" "}
                    {agoLabel(o.live.fetched_at)}
                  </small>
                ) : o.mode === "flight" && fk && !lf ? (
                  <small>Checking…</small>
                ) : (
                  <small>est.</small>
                );

                return (
                  <div
                    key={o.mode}
                    className={`opt${r.mode && r.mode.mode === o.mode ? " on" : ""}`}
                    onClick={() => onPickMode(o.mode)}
                  >
                    <span className="ico">{o.icon}</span>
                    <div>
                      <div className="nm">{o.name}</div>
                      <div className="meta">
                        ~{hrsLabel(o.hrs)} each way · {o.note}
                      </div>
                    </div>
                    <div className="pr">
                      {fmt(o.cost)}
                      {badge}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="section">
          <h3>Check live prices &amp; book</h3>
          {liveFlight?.link && (
            <>
              <a
                className="btn-primary book"
                target="_blank"
                rel="noopener noreferrer"
                href={liveFlight.link}
              >
                ✈️ Book this {fmt(liveFlight.price)} flight ({liveFlight.from} →{" "}
                {liveFlight.to}) →
              </a>
              <p className="muted small" style={{ margin: "6px 0 10px" }}>
                Cheapest return fare found recently for {MONTHS[state.month - 1]} ·
                opens Aviasales to pick exact dates
              </p>
            </>
          )}
          <div className="live-links">
            {bookingLinks.map(([lbl, url]) => (
              <a
                key={lbl}
                className="btn-ghost"
                target="_blank"
                rel="noopener noreferrer"
                href={url}
              >
                {lbl} ↗
              </a>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Where to stay</h3>
          <div className="opts">
            {stays.map(([title, provider, url]) => (
              <a
                key={`${title}-${provider}`}
                className="opt stay"
                target="_blank"
                rel="noopener noreferrer"
                href={url}
              >
                <div>
                  <div className="nm">{title}</div>
                  <div className="meta">{provider}</div>
                </div>
                <div className="pr">↗</div>
              </a>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Tours, tickets &amp; travel SIM</h3>
          <div className="opts">
            {extras.map(([title, sub, url]) => (
              <a
                key={title}
                className="opt stay"
                target="_blank"
                rel="noopener noreferrer"
                href={url}
              >
                <div>
                  <div className="nm">{title}</div>
                  <div className="meta">{sub}</div>
                </div>
                <div className="pr">↗</div>
              </a>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>{state.days}-day itinerary</h3>
          <div className="timeline">
            {daysPlan.map((day) => (
              <div key={day.day} className="day">
                <h4>
                  <span>Day {day.day}</span> · {day.title}
                </h4>
                <ul>
                  {day.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Must try food</h3>
          <div className="chips food-chips">
            {d.eat.map((x) => (
              <span key={x} className="chip">
                🍲 {x}
              </span>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Best time</h3>
          <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
            <b style={{ color: "var(--green)" }}>Peak:</b>{" "}
            {d.best.map((m) => SHORT_MONTHS[m - 1]).join(", ")}
            {d.avoid.length > 0 && (
              <>
                {" "}
                · <b style={{ color: "var(--red)" }}>Avoid:</b>{" "}
                {d.avoid.map((m) => SHORT_MONTHS[m - 1]).join(", ")}
              </>
            )}
          </p>
        </div>

        <div className="section">
          <h3>Good to know</h3>
          <ul className="list">
            {d.tips.map((x) => (
              <li key={x}>{x}</li>
            ))}
            {d.skip.map((x) => (
              <li key={x} style={{ color: "var(--amber)" }}>
                Skip: {x}
              </li>
            ))}
          </ul>
          <p className="muted small" style={{ marginTop: 8 }}>
            Full static guide:{" "}
            <Link href={`/guides/${d.id}/`} style={{ color: "var(--accent-2)" }}>
              {d.name} budget &amp; itinerary guide →
            </Link>
          </p>
        </div>

        <div className="section">
          <h3>Split with your group</h3>
          <div className="split">
            <div className="split-row">
              <span>Travellers sharing</span>
              <div className="stepper">
                <button
                  type="button"
                  id="splitMinus"
                  onClick={() => onAdjustTravelers(-1)}
                >
                  −
                </button>
                <span>{n}</span>
                <button
                  type="button"
                  id="splitPlus"
                  onClick={() => onAdjustTravelers(1)}
                >
                  +
                </button>
              </div>
            </div>
            <div className="split-total">
              <span>Each person pays</span>
              <b>{fmt(cost.total)}</b>
            </div>
            <div
              className="split-total"
              style={{ border: "none", paddingTop: 4, marginTop: 0 }}
            >
              <span className="muted">Group total</span>
              <span>{fmt(cost.total * n)}</span>
            </div>
          </div>
          <div className="actions">
            <a
              className="btn-wa"
              id="waPlanBtn"
              href={waUrl(fullPlanText)}
              target="_blank"
              rel="noopener noreferrer"
            >
              📲 Share on WhatsApp
            </a>
            <button
              className="btn-ghost"
              type="button"
              id="copyBtn"
              onClick={() => onCopyPlan(fullPlanText)}
            >
              📋 Copy trip plan
            </button>
          </div>
        </div>

        <p className="note">
          Flight fares marked 📡 Live come from recent searches via Travelpayouts /
          Aviasales; all other costs (trains, buses, stays, food, activities) are
          estimates for {n} {n === 1 ? "person" : "people"} on a {state.stay} budget.
          Click through to confirm exact dates before booking. Some links are
          affiliate links, so we may earn a small commission at no extra cost to you.
        </p>
      </div>
    </>
  );
}
