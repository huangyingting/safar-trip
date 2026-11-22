import {
  AIRALO,
  BudgetMode,
  Destination,
  DESTINATIONS,
  GroupType,
  IATA,
  LAST_KM,
  MONTHS,
  Origin,
  ORIGINS,
  ScopeType,
  SortType,
  StayTier,
  TransportFilter,
  TransportModeId,
  WeatherFilter,
} from "./data";
import { TP_MARKER, TP_TRS } from "./config";

export interface PlannerState {
  from: string;
  budget: number;
  budgetMode: BudgetMode;
  days: number;
  travelers: number;
  month: number;
  group: GroupType;
  vibes: string[];
  scope: ScopeType;
  stay: StayTier;
  transport: TransportFilter;
  maxTravel: number;
  weather: WeatherFilter;
  sort: SortType;
  hideOff: boolean;
  stretch: boolean;
  offbeat: boolean;
  kids: boolean;
  seniors: boolean;
  nopass: boolean;
}

export interface LiveFareData {
  found: boolean;
  from: string;
  to: string;
  month: string;
  price: number;
  currency?: string;
  airline?: string;
  transfers?: number;
  return_transfers?: number;
  departure_at?: string;
  return_at?: string;
  link?: string;
  fetched_at?: string;
}

export interface LiveFareEntry {
  status: "loading" | "ok" | "none" | "error";
  data?: LiveFareData;
}

export interface TravelOption {
  mode: TransportModeId;
  icon: string;
  name: string;
  cost: number;
  hrs: number;
  note: string;
  live?: LiveFareData;
}

export type WeatherKey = "freezing" | "cold" | "pleasant" | "warm" | "hot" | "rainy";

export interface WeatherInfo {
  k: WeatherKey;
  label: string;
  icon: string;
}

export interface CostBreakdown {
  travel: number;
  stay: number;
  food: number;
  local: number;
  act: number;
  misc: number;
  total: number;
  nights: number;
}

export type SeasonQuality = "peak" | "off" | "ok";

export interface TripFlag {
  t: "warn" | "info";
  m: string;
}

export interface EvaluatedTrip {
  d: Destination;
  km: number;
  opts: TravelOption[];
  mode: TravelOption | null;
  season: SeasonQuality;
  wx: WeatherInfo;
  cost: CostBreakdown;
  ratio: number;
  within: boolean;
  score: number;
  flags: TripFlag[];
}

export interface ComputeStats {
  budget: number;
  other: number;
  cheapestHidden: number;
}

export interface ItineraryDay {
  day: number;
  title: string;
  items: string[];
}

export const BUDGET_MIN = 2000;
export const BUDGET_MAX = 1000000;

export function fmt(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function fmtK(raw: number): string {
  const n = Math.round(raw / 100) * 100;
  if (n >= 100000) return "₹" + (n / 100000).toFixed(n % 100000 ? 1 : 0) + "L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(n % 1000 ? 1 : 0) + "k";
  return "₹" + n;
}

export function hrsLabel(h: number): string {
  if (h < 1) return Math.round(h * 60) + " min";
  if (h < 24) return (Math.round(h * 2) / 2).toString().replace(".5", "½") + " hrs";
  return Math.floor(h / 24) + "d " + Math.round(h % 24) + "h";
}

export function agoLabel(iso?: string): string {
  if (!iso) return "recently";
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
  return h < 1 ? "just now" : h < 24 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`;
}

export function toSlider(v: number): number {
  const clamped = Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, v));
  return Math.round(
    (Math.log(clamped / BUDGET_MIN) / Math.log(BUDGET_MAX / BUDGET_MIN)) * 100
  );
}

export function fromSlider(t: number): number {
  const v = BUDGET_MIN * Math.pow(BUDGET_MAX / BUDGET_MIN, t / 100);
  const step = v < 20000 ? 500 : v < 100000 ? 1000 : v < 300000 ? 5000 : 10000;
  return Math.round(v / step) * step;
}

export function createDefaults(now = new Date()): PlannerState {
  return {
    from: "delhi",
    budget: 15000,
    budgetMode: "pp",
    days: 4,
    travelers: 2,
    month: ((now.getMonth() + 1) % 12) + 1,
    group: "friends",
    vibes: [],
    scope: "india",
    stay: "budget",
    transport: "any",
    maxTravel: 24,
    weather: "any",
    sort: "match",
    hideOff: true,
    stretch: true,
    offbeat: false,
    kids: false,
    seniors: false,
    nopass: false,
  };
}

export function readHash(
  hashStr: string,
  defaults: PlannerState
): { patch: Partial<PlannerState>; trip?: string } | null {
  if (!hashStr || hashStr.length < 2) return null;
  const raw = hashStr.startsWith("#") ? hashStr.slice(1) : hashStr;
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  const patch: Record<string, unknown> = {};
  let trip: string | undefined;

  for (const [k, v] of p.entries()) {
    if (k === "trip") {
      trip = v;
      continue;
    }
    if (!(k in defaults)) continue;
    const def = defaults[k as keyof PlannerState];
    if (Array.isArray(def)) {
      patch[k] = v ? v.split(",").filter(Boolean) : [];
    } else if (typeof def === "number") {
      patch[k] = Number(v) || def;
    } else if (typeof def === "boolean") {
      patch[k] = v === "1";
    } else {
      patch[k] = v;
    }
  }
  return { patch: patch as Partial<PlannerState>, trip };
}

export function buildHash(
  state: PlannerState,
  defaults: PlannerState,
  selectedId: string | null
): string {
  const p = new URLSearchParams();
  for (const k of Object.keys(defaults) as (keyof PlannerState)[]) {
    const v = state[k];
    const d = defaults[k];
    if (JSON.stringify(v) === JSON.stringify(d)) continue;
    p.set(
      k,
      Array.isArray(v)
        ? v.join(",")
        : typeof v === "boolean"
          ? v
            ? "1"
            : "0"
          : String(v)
    );
  }
  if (selectedId) p.set("trip", selectedId);
  const s = p.toString();
  return s ? "#" + s : "";
}

// ---------------- Geo helpers ----------------
const DEG_TO_RAD = Math.PI / 180;

export function hav(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function greatCircle(
  a: [number, number],
  b: [number, number],
  n = 96
): [number, number][] {
  const l1 = a[0] * DEG_TO_RAD;
  const p1 = a[1] * DEG_TO_RAD;
  const l2 = b[0] * DEG_TO_RAD;
  const p2 = b[1] * DEG_TO_RAD;
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((p2 - p1) / 2) ** 2 +
          Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2
      )
    );
  if (!d) return [a, b];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    pts.push([
      Math.atan2(y, x) / DEG_TO_RAD,
      Math.atan2(z, Math.sqrt(x * x + y * y)) / DEG_TO_RAD,
    ]);
  }
  return pts;
}

export function bearing(a: [number, number], b: [number, number]): number {
  const y = Math.sin((b[0] - a[0]) * DEG_TO_RAD) * Math.cos(b[1] * DEG_TO_RAD);
  const x =
    Math.cos(a[1] * DEG_TO_RAD) * Math.sin(b[1] * DEG_TO_RAD) -
    Math.sin(a[1] * DEG_TO_RAD) *
      Math.cos(b[1] * DEG_TO_RAD) *
      Math.cos((b[0] - a[0]) * DEG_TO_RAD);
  return (Math.atan2(y, x) / DEG_TO_RAD + 360) % 360;
}

// ---------------- Live fare helpers ----------------
export function fareMonth(monthNum: number, now = new Date()): string {
  const y = now.getFullYear() + (monthNum < now.getMonth() + 1 ? 1 : 0);
  return `${y}-${String(monthNum).padStart(2, "0")}`;
}

export function fareKey(fromId: string, destId: string, monthNum: number, now = new Date()): string | null {
  const a = IATA[fromId];
  const b = IATA[destId];
  return a && b && a !== b ? `${a}-${b}-${fareMonth(monthNum, now)}` : null;
}

// ---------------- Trip engine ----------------
export const TIER: Record<
  StayTier,
  {
    room: number;
    food: number;
    act: number;
    trainCls: string;
    trainRate: number;
    busRate: number;
    timeVal: number;
  }
> = {
  hostel: { room: 0.45, food: 0.8, act: 0.8, trainCls: "Sleeper", trainRate: 0.6, busRate: 1.2, timeVal: 80 },
  budget: { room: 1, food: 1, act: 1, trainCls: "3AC", trainRate: 1.6, busRate: 1.7, timeVal: 150 },
  mid: { room: 2.3, food: 1.6, act: 1.3, trainCls: "2AC", trainRate: 2.3, busRate: 1.7, timeVal: 450 },
  luxury: { room: 5.5, food: 3, act: 1.8, trainCls: "1AC", trainRate: 3.8, busRate: 2, timeVal: 1500 },
};

export const WX: Record<WeatherKey, { label: string; icon: string }> = {
  freezing: { label: "Freezing", icon: "🥶" },
  cold: { label: "Cold", icon: "❄️" },
  pleasant: { label: "Pleasant", icon: "🌤️" },
  warm: { label: "Warm", icon: "☀️" },
  hot: { label: "Very hot", icon: "🔥" },
  rainy: { label: "Rainy", icon: "🌧️" },
};

export function weather(d: Destination, m: number): WeatherInfo {
  let k: WeatherKey;
  switch (d.clim) {
    case "high":
      k = m >= 6 && m <= 9 ? "pleasant" : m === 5 || m === 10 ? "cold" : "freezing";
      break;
    case "hill":
      k = m === 12 || m <= 2 ? "cold" : m >= 7 && m <= 9 ? "rainy" : "pleasant";
      break;
    case "beach":
      k = m >= 11 || m <= 2 ? "pleasant" : m >= 6 && m <= 9 ? "rainy" : "warm";
      break;
    case "plain":
      k = m >= 11 || m <= 2 ? "pleasant" : m >= 4 && m <= 6 ? "hot" : m >= 7 && m <= 9 ? "rainy" : "warm";
      break;
    case "desert":
      k = m >= 11 || m <= 2 ? "pleasant" : m >= 4 && m <= 9 ? "hot" : "warm";
      break;
    case "gulf":
      k = m >= 11 || m <= 3 ? "pleasant" : "hot";
      break;
    default:
      k = d.avoid.includes(m) ? "rainy" : "warm";
  }
  return { k, ...WX[k] };
}

export function weatherMatch(k: WeatherKey, f: WeatherFilter): boolean {
  return (
    f === "any" ||
    (f === "cold" && (k === "cold" || k === "freezing")) ||
    (f === "pleasant" && k === "pleasant") ||
    (f === "warm" && (k === "warm" || k === "hot"))
  );
}

export type CalcParams = Pick<
  PlannerState,
  "from" | "days" | "travelers" | "group" | "stay" | "transport" | "maxTravel"
>;

export function travelOptions(
  o: Origin,
  d: Destination,
  S: Pick<PlannerState, "from" | "travelers" | "stay">,
  lf?: LiveFareEntry | null
): TravelOption[] {
  const fly = hav(o, d);
  const road = fly * 1.3;
  const n = S.travelers;
  const T = TIER[S.stay];
  const modes = d.modes || ["flight", "train", "bus", "car"];
  const opts: TravelOption[] = [];
  if (fly < 40) return opts;

  if (modes.includes("flight") && d.air != null && fly > 250) {
    const one = d.intl ? 4500 + 3.3 * fly : Math.max(2800, 1800 + 3 * fly);
    if (lf && lf.status === "ok" && lf.data) {
      const km = LAST_KM[d.id] ?? d.air;
      opts.push({
        mode: "flight",
        icon: "✈️",
        name: "Flight",
        live: lf.data,
        cost: lf.data.price + km * 4 * 2,
        hrs: 2.5 + fly / 750 + km / 35,
        note: `${IATA[S.from]} → ${IATA[d.id]}${lf.data.transfers ? ` · ${lf.data.transfers} stop` : " · non-stop"}${km ? ` · then ${km} km by road` : ""}`,
      });
    } else {
      opts.push({
        mode: "flight",
        icon: "✈️",
        name: "Flight",
        cost: (one + d.air * 4) * 2,
        hrs: 2.5 + fly / 750 + d.air / 35,
        note: d.air ? `then ${d.air} km by road` : "lands in the city",
      });
    }
  }

  if (modes.includes("train") && d.rail != null && road > 80 && !d.intl) {
    const one = Math.max(400, T.trainRate * road) + d.rail * 4;
    opts.push({
      mode: "train",
      icon: "🚆",
      name: `Train · ${T.trainCls}`,
      cost: one * 2,
      hrs: road / 52 + d.rail / 35 + 0.5,
      note: d.rail ? `then ${d.rail} km by road` : "station in town",
    });
  }

  if (modes.includes("bus") && road <= 1400 && road > 40) {
    const one = Math.max(300, T.busRate * road);
    opts.push({
      mode: "bus",
      icon: "🚌",
      name: S.stay === "hostel" ? "Sleeper bus" : "Volvo AC bus",
      cost: one * 2,
      hrs: road / 45 + 0.5,
      note: "overnight buses run",
    });
  }

  if (modes.includes("car") && road <= 1600 && road > 40) {
    const cars = Math.ceil(n / 4);
    opts.push({
      mode: "car",
      icon: "🚗",
      name: "Road trip",
      cost: ((10 * road * cars) / n) * 2,
      hrs: road / 50 + Math.floor(road / 250) * 0.25,
      note: `fuel + tolls, ${cars} car${cars > 1 ? "s" : ""} split ${n} ways`,
    });
  }

  return opts;
}

export function pickMode(
  opts: TravelOption[],
  d: Destination,
  S: Pick<PlannerState, "transport" | "maxTravel" | "days" | "stay">,
  modeOverride: Record<string, TransportModeId> = {}
): TravelOption | null {
  const forced = modeOverride[d.id] || (S.transport !== "any" ? S.transport : null);
  if (forced) return opts.find((o) => o.mode === forced) || null;
  const limit = Math.min(S.maxTravel, Math.max(8, S.days * 7));
  let pool = opts.filter((o) => o.hrs <= limit);
  if (!pool.length) pool = opts.slice();
  if (!pool.length) return null;
  const w = TIER[S.stay].timeVal;
  return pool.reduce((a, b) => (a.cost + a.hrs * w <= b.cost + b.hrs * w ? a : b));
}

export function costsFor(
  d: Destination,
  mode: TravelOption | null,
  season: SeasonQuality,
  S: Pick<PlannerState, "travelers" | "days" | "stay" | "group">
): CostBreakdown {
  const n = S.travelers;
  const days = S.days;
  const nights = Math.max(1, days - 1);
  const T = TIER[S.stay];
  const occ =
    S.group === "solo" || n === 1 ? 1 : S.group === "family" ? Math.min(3, n) : 2;
  const seasonMul = season === "peak" ? 1.15 : season === "off" ? 0.8 : 1;
  const rooms = S.stay === "hostel" ? n : Math.ceil(n / occ);
  const stay = (rooms * d.stay * T.room * seasonMul * nights) / n;
  const food = d.food * T.food * days;
  const local =
    ((d.local * Math.ceil(n / 4) * days) / n) * (S.stay === "luxury" ? 1.5 : 1);
  const act = d.act * T.act * Math.max(1, days * 0.7);
  const travel = mode ? mode.cost : 0;
  const visa = d.intl && !d.visaEasy ? 3000 : 0;
  const sub = travel + stay + food + local + act;
  const misc = sub * 0.05 + visa;
  return { travel, stay, food, local, act, misc, total: sub + misc, nights };
}

export function budgetPP(S: Pick<PlannerState, "budget" | "budgetMode" | "travelers">): number {
  return S.budgetMode === "total" ? S.budget / S.travelers : S.budget;
}

export function evaluate(
  d: Destination,
  S: PlannerState,
  liveFares: Record<string, LiveFareEntry> = {},
  modeOverride: Record<string, TransportModeId> = {},
  now = new Date()
): EvaluatedTrip {
  const o = ORIGINS.find((x) => x.id === S.from) || ORIGINS[0];
  const km = hav(o, d);
  const fk = fareKey(S.from, d.id, S.month, now);
  const lf = fk ? liveFares[fk] : null;
  const opts = travelOptions(o, d, S, lf);
  const mode = pickMode(opts, d, S, modeOverride);
  const season: SeasonQuality = d.best.includes(S.month)
    ? "peak"
    : d.avoid.includes(S.month)
      ? "off"
      : "ok";
  const wx = weather(d, S.month);
  const cost = costsFor(d, mode, season, S);
  const bpp = budgetPP(S);
  const ratio = cost.total / bpp;

  let sc = 55;
  if (S.vibes.length) {
    const ov = d.tags.filter((t) => S.vibes.includes(t)).length;
    sc += (28 * ov) / S.vibes.length - (ov ? 0 : 20);
  } else {
    sc += 10;
  }
  sc += d.for.includes(S.group) ? 8 : -8;
  sc += season === "peak" ? 12 : season === "off" ? -25 : 0;
  sc += ratio <= 1 ? 10 - Math.max(0, 0.5 - ratio) * 10 : -40 * (ratio - 1);
  if (mode) sc -= Math.min(18, (mode.hrs / (S.days * 24)) * 60);
  sc += (d.rating - 4.5) * 14;
  if (S.offbeat && d.offbeat) sc += 6;

  const flags: TripFlag[] = [];
  if (season === "off") {
    flags.push({
      t: "warn",
      m: `${MONTHS[S.month - 1]} is off-season here (${wx.label.toLowerCase()}). Prices are lower, but some things may be closed.`,
    });
  }
  if (mode && mode.hrs > S.days * 6) {
    flags.push({
      t: "warn",
      m: `Long journey (${hrsLabel(mode.hrs)} each way) for a ${S.days}-day trip. Add days or fly.`,
    });
  }
  if (d.visa) flags.push({ t: "info", m: `🛂 ${d.visa}` });
  if (d.noKids) flags.push({ t: "info", m: "High altitude: rest a day on arrival to acclimatise." });

  return {
    d,
    km,
    opts,
    mode,
    season,
    wx,
    cost,
    ratio,
    within: ratio <= 1,
    score: Math.max(5, Math.min(99, Math.round(sc))),
    flags,
  };
}

export function computeResults(
  S: PlannerState,
  liveFares: Record<string, LiveFareEntry> = {},
  modeOverride: Record<string, TransportModeId> = {},
  now = new Date()
): { results: EvaluatedTrip[]; stats: ComputeStats } {
  const o = ORIGINS.find((x) => x.id === S.from) || ORIGINS[0];
  const stats: ComputeStats = { budget: 0, other: 0, cheapestHidden: Infinity };
  const out: EvaluatedTrip[] = [];

  for (const d of DESTINATIONS) {
    if (S.scope === "india" && d.intl) continue;
    if (S.scope === "intl" && !d.intl) continue;
    if (hav(o, d) < 40) continue;
    if (S.vibes.length && !d.tags.some((t) => S.vibes.includes(t))) {
      stats.other++;
      continue;
    }
    if (S.kids && d.noKids) {
      stats.other++;
      continue;
    }
    if (S.seniors && !d.easy) {
      stats.other++;
      continue;
    }
    if (S.offbeat && !d.offbeat) {
      stats.other++;
      continue;
    }
    if (S.nopass && d.intl && !d.visaEasy) {
      stats.other++;
      continue;
    }
    const r = evaluate(d, S, liveFares, modeOverride, now);
    if (!weatherMatch(r.wx.k, S.weather)) {
      stats.other++;
      continue;
    }
    if (S.hideOff && r.season === "off") {
      stats.other++;
      continue;
    }
    if (!r.mode) {
      stats.other++;
      continue;
    }
    if (r.mode.hrs > S.maxTravel) {
      stats.other++;
      continue;
    }
    if (r.ratio > (S.stretch ? 1.2 : 1)) {
      stats.budget++;
      stats.cheapestHidden = Math.min(stats.cheapestHidden, r.cost.total);
      continue;
    }
    out.push(r);
  }

  const sorters: Record<SortType, (a: EvaluatedTrip, b: EvaluatedTrip) => number> = {
    match: (a, b) => b.score - a.score,
    cheap: (a, b) => a.cost.total - b.cost.total,
    near: (a, b) => (a.mode?.hrs || 0) - (b.mode?.hrs || 0),
    rating: (a, b) => b.d.rating - a.d.rating || b.score - a.score,
  };
  out.sort(sorters[S.sort]);
  return { results: out, stats };
}

export function itinerary(
  r: EvaluatedTrip,
  S: Pick<PlannerState, "from" | "days">
): ItineraryDay[] {
  const d = r.d;
  const o = ORIGINS.find((x) => x.id === S.from) || ORIGINS[0];
  const days = S.days;
  const hl = d.hl.slice();
  const out: ItineraryDay[] = [];
  const m = r.mode;
  const go = m
    ? `${m.icon} ${o.name} → ${d.name} by ${m.name} (~${hrsLabel(m.hrs)})`
    : `Travel to ${d.name}`;
  const back = m ? `${m.icon} Return to ${o.name}` : "Return home";
  let usedNear = false;

  if (days === 1) {
    return [
      {
        day: 1,
        title: "Quick getaway",
        items: [go, hl.shift(), hl.shift(), back].filter((x): x is string => Boolean(x)),
      },
    ];
  }

  for (let i = 1; i <= days; i++) {
    const items: string[] = [];
    let title = "Explore";
    if (i === 1) {
      title = "Arrive & settle in";
      if (m && m.hrs > 10) items.push("🌙 Leave the evening before: overnight journey");
      items.push(go, "Check in & freshen up");
      if (hl.length) items.push(hl.shift()!);
      items.push(`🍽️ Dinner: try ${d.eat[0]}`);
    } else if (i === days) {
      title = "Last morning & head home";
      if (hl.length) items.push(hl.shift()!);
      items.push("🛍️ Souvenir shopping & checkout", back);
    } else {
      for (let k = 0; k < 2 && hl.length; k++) items.push(hl.shift()!);
      if (items.length && d.eat[i - 1]) items.push(`🍽️ Must eat: ${d.eat[i - 1]}`);
      if (!items.length && !usedNear) {
        title = "Day trip";
        items.push(`🚙 Day trip: ${d.near}`);
        usedNear = true;
      } else if (!items.length) {
        title = "Slow day";
        items.push(
          "😌 Free day: sleep in, cafés, local markets, or redo your favourite spot"
        );
      }
    }
    out.push({ day: i, title, items });
  }
  return out;
}

// ---------------- Affiliate & Booking Links ----------------
export function liveLinks(
  d: Destination,
  S: Pick<PlannerState, "from" | "month" | "travelers">,
  now = new Date()
): [string, string][] {
  const o = ORIGINS.find((x) => x.id === S.from) || ORIGINS[0];
  const [y, m] = fareMonth(S.month, now).split("-");
  const when = `${MONTHS[Number(m) - 1]} ${y}`;
  const city = d.name.split(" & ")[0];
  const links: [string, string][] = [
    [
      "✈️ Flights · Google",
      `https://www.google.com/travel/flights?q=${encodeURIComponent(`round trip flights from ${o.name} to ${IATA[d.id] || city} in ${when}`)}`,
    ],
    ["✈️ Flights · MakeMyTrip", "https://www.makemytrip.com/flights/"],
  ];
  if (!d.intl) {
    links.push(["🚆 Trains · IRCTC", "https://www.irctc.co.in/nget/train-search"]);
    links.push(["🚌 Buses · redBus", "https://www.redbus.in/"]);
  }
  links.push([
    "🏨 Hotels · Booking.com",
    `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city + (d.intl ? "" : ", India"))}&group_adults=${S.travelers}&no_rooms=${Math.max(1, Math.ceil(S.travelers / 2))}`,
  ]);
  return links;
}

export function extrasLinks(d: Destination): [string, string, string][] {
  const q = d.name
    .split(" & ")[0]
    .replace("Leh-Ladakh", "Ladakh")
    .replace("Rann of Kutch", "Kutch");
  const klook = `https://tp.media/r?marker=${TP_MARKER}&trs=${TP_TRS}&p=4110&campaign_id=137&u=${encodeURIComponent(`https://www.klook.com/en-IN/search/result/?query=${q}`)}`;
  const out: [string, string, string][] = [
    ["🎟️ Tours & activities in " + q, "Tickets, tours & experiences on Klook", klook],
  ];
  if (AIRALO[d.id]) {
    out.push([
      `📶 ${AIRALO[d.id][0]} eSIM`,
      "Skip roaming charges: instant data plan from Airalo",
      AIRALO[d.id][1],
    ]);
  }
  return out;
}

export function stayLinks(
  d: Destination,
  S: Pick<PlannerState, "stay" | "travelers">
): [string, string, string][] {
  const city = d.name.split(" & ")[0];
  const place = city + (d.intl ? "" : ", India");
  const rooms = Math.max(1, Math.ceil(S.travelers / 2));
  const bk = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(place)}&group_adults=${S.travelers}&no_rooms=${rooms}`;
  const all: Record<string, [string, string, string]> = {
    hotel: ["🏨 Hotels", "Booking.com", bk],
    agoda: [
      "🏨 Hotels",
      "Agoda",
      `https://www.agoda.com/search?textToSearch=${encodeURIComponent(city)}&adults=${S.travelers}&rooms=${rooms}`,
    ],
    mmt: ["🏨 Hotels & homestays", "MakeMyTrip", "https://www.makemytrip.com/hotels/"],
    hostel: ["🛏️ Hostels", "Booking.com", bk + "&nflt=ht_id%3D203"],
    zostel: ["🎒 Backpacker hostels", "Zostel", "https://www.zostel.com/"],
    home: [
      "🏡 Homestays & villas",
      "Airbnb",
      `https://www.airbnb.co.in/s/${encodeURIComponent(place.replace(/, /g, "--").replace(/ /g, "-"))}/homes?adults=${S.travelers}`,
    ],
    lux: ["✨ Luxury stays", "Booking.com", bk + "&nflt=class%3D5%3Bclass%3D4"],
  };
  const order = {
    hostel: ["hostel", "zostel", "home", "hotel", "agoda"],
    budget: ["hotel", "agoda", "mmt", "home", "hostel"],
    mid: ["hotel", "agoda", "mmt", "home", "lux"],
    luxury: ["lux", "agoda", "home", "hotel"],
  }[S.stay];
  return order
    .filter((k) => (k !== "zostel" && k !== "mmt") || !d.intl)
    .map((k) => all[k]);
}

// ---------------- WhatsApp & Share formatting ----------------
export function waSafe(text: string): string {
  return text
    .replace(/\uFE0F/g, "")
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^ +/gm, "");
}

export function waUrl(text: string): string {
  return "https://api.whatsapp.com/send?text=" + encodeURIComponent(waSafe(text));
}

export function planText(
  r: EvaluatedTrip,
  S: Pick<PlannerState, "from" | "days" | "month" | "travelers">,
  shareHref: string
): string {
  const o = ORIGINS.find((x) => x.id === S.from) || ORIGINS[0];
  const lines = [
    `✈ *${r.d.name} trip plan* (${S.days} days, ${MONTHS[S.month - 1]})`,
    `From ${o.name} · ${S.travelers} ${S.travelers === 1 ? "traveller" : "travellers"}`,
    `✅ ${fmt(r.cost.total)} per person (${fmt(r.cost.total * S.travelers)} total)`,
    r.mode ? `${r.mode.name}, ~${hrsLabel(r.mode.hrs)} each way` : "",
    "",
    ...itinerary(r, S).map(
      (day) =>
        `*Day ${day.day}:* ${day.items
          .filter((x) => !/^(Check in|🍽️|🛍️|🌙)/.test(x))
          .map((x) =>
            x.replace(/^\S+\s(?=\S)/u, (m) =>
              /\p{Extended_Pictographic}/u.test(m) ? "" : m
            )
          )
          .slice(0, 3)
          .join(", ")}`
    ),
    "",
    `Plan yours ⬇\n${shareHref}`,
  ];
  return lines.filter((l, i) => l !== "" || lines[i - 1] !== "").join("\n");
}
