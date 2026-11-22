import {
  ClimateType,
  Destination,
  DESTINATIONS,
  GroupType,
  ORIGINS,
  SHORT_MONTHS,
  VIBES,
} from "./data";
import {
  costsFor,
  fmt,
  hav,
  hrsLabel,
  pickMode,
  travelOptions,
} from "./engine";

export interface GuideCategory {
  title: string;
  ids: string[];
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    title: "🏔️ Mountains & snow",
    ids: [
      "manali",
      "rishikesh",
      "kasol",
      "shimla",
      "mussoorie",
      "ladakh",
      "spiti",
      "darjeeling",
      "gangtok",
      "munnar",
      "ooty",
      "coorg",
      "lonavala",
      "mcleodganj",
      "auli",
      "kashmir",
    ],
  },
  {
    title: "🏖️ Beaches & islands",
    ids: ["goa", "andaman", "alleppey", "varkala", "pondicherry", "gokarna"],
  },
  {
    title: "🏰 Heritage, spiritual & desert",
    ids: [
      "jaipur",
      "udaipur",
      "jaisalmer",
      "varanasi",
      "amritsar",
      "agra",
      "hampi",
      "kutch",
      "ranthambore",
    ],
  },
  {
    title: "🐅 Wildlife & nature",
    ids: ["meghalaya", "corbett"],
  },
  {
    title: "🌏 Abroad from India",
    ids: [
      "thailand",
      "dubai",
      "vietnam",
      "bali",
      "nepal",
      "srilanka",
      "maldives",
      "singapore",
    ],
  },
];

export interface BudgetGuideDef {
  slug: string;
  limit: number;
  limitLabel: string;
  originId: "delhi" | "mumbai" | "bengaluru";
  originName: string;
  hubLabel: string;
  shortLabel: string;
}

export const BUDGET_GUIDES: BudgetGuideDef[] = [
  {
    slug: "trips-under-10000-from-delhi",
    limit: 10000,
    limitLabel: "₹10,000",
    originId: "delhi",
    originName: "Delhi",
    hubLabel: "Trips under ₹10,000 from Delhi",
    shortLabel: "Under ₹10,000 from Delhi",
  },
  {
    slug: "trips-under-15000-from-delhi",
    limit: 15000,
    limitLabel: "₹15,000",
    originId: "delhi",
    originName: "Delhi",
    hubLabel: "Trips under ₹15,000 from Delhi",
    shortLabel: "Under ₹15,000 from Delhi",
  },
  {
    slug: "trips-under-25000-from-delhi",
    limit: 25000,
    limitLabel: "₹25,000",
    originId: "delhi",
    originName: "Delhi",
    hubLabel: "Trips under ₹25,000 from Delhi",
    shortLabel: "Under ₹25,000 from Delhi",
  },
  {
    slug: "trips-under-10000-from-mumbai",
    limit: 10000,
    limitLabel: "₹10,000",
    originId: "mumbai",
    originName: "Mumbai",
    hubLabel: "Trips under ₹10,000 from Mumbai",
    shortLabel: "Under ₹10,000 from Mumbai",
  },
  {
    slug: "trips-under-15000-from-mumbai",
    limit: 15000,
    limitLabel: "₹15,000",
    originId: "mumbai",
    originName: "Mumbai",
    hubLabel: "Trips under ₹15,000 from Mumbai",
    shortLabel: "Under ₹15,000 from Mumbai",
  },
  {
    slug: "trips-under-25000-from-mumbai",
    limit: 25000,
    limitLabel: "₹25,000",
    originId: "mumbai",
    originName: "Mumbai",
    hubLabel: "Trips under ₹25,000 from Mumbai",
    shortLabel: "Under ₹25,000 from Mumbai",
  },
  {
    slug: "trips-under-10000-from-bengaluru",
    limit: 10000,
    limitLabel: "₹10,000",
    originId: "bengaluru",
    originName: "Bengaluru",
    hubLabel: "Trips under ₹10,000 from Bengaluru",
    shortLabel: "Under ₹10,000 from Bengaluru",
  },
  {
    slug: "trips-under-15000-from-bengaluru",
    limit: 15000,
    limitLabel: "₹15,000",
    originId: "bengaluru",
    originName: "Bengaluru",
    hubLabel: "Trips under ₹15,000 from Bengaluru",
    shortLabel: "Under ₹15,000 from Bengaluru",
  },
  {
    slug: "trips-under-25000-from-bengaluru",
    limit: 25000,
    limitLabel: "₹25,000",
    originId: "bengaluru",
    originName: "Bengaluru",
    hubLabel: "Trips under ₹25,000 from Bengaluru",
    shortLabel: "Under ₹25,000 from Bengaluru",
  },
];

export const CLIMATE_DESCRIPTIONS: Record<ClimateType, string> = {
  beach:
    "Pleasant from November to February, warm and humid in March–May, monsoon rain from June to September.",
  hill:
    "Cold with possible snow in December–February, pleasant from March to June and in October–November, rainy in July–September.",
  high:
    "Freezing in winter (Nov–Mar, many roads closed), cold in spring and autumn, pleasant from June to September.",
  plain:
    "Pleasant from November to February, very hot in April–June, rainy in July–September.",
  desert:
    "Pleasant days and cold nights from November to February, very hot from April to September.",
  gulf:
    "Pleasant from November to March, extremely hot from April to October.",
  trop:
    "Warm all year, with a rainy season in the months to avoid.",
};

/**
 * Python-style round-half-to-even to the nearest ₹10 (`round(x, -1)` in Python 3),
 * matching the static guide generator on safar-trip.pages.dev.
 */
export function roundEven10(x: number): number {
  const scaled = x / 10;
  const fl = Math.floor(scaled);
  const diff = scaled - fl;
  const eps = 1e-9;
  let r: number;
  if (Math.abs(diff - 0.5) < eps) {
    r = fl % 2 === 0 ? fl : fl + 1;
  } else {
    r = Math.round(scaled);
  }
  return r * 10;
}

export function formatSortedMonths(months: number[]): string {
  return [...months]
    .sort((a, b) => a - b)
    .map((m) => SHORT_MONTHS[m - 1])
    .join(", ");
}

export function guideModeLabel(modeId: string): string {
  if (modeId === "flight") return "Flight";
  if (modeId === "train") return "Train (3AC)";
  if (modeId === "bus") return "AC bus";
  return "Road trip";
}

const GROUP_LABELS: Record<GroupType, string> = {
  friends: "friends",
  couple: "couples",
  solo: "solo travellers",
  family: "families",
};

export interface CityModeCell {
  cost: number;
  hrsLabel: string;
}

export interface CityTripRow {
  originId: string;
  originName: string;
  totalCost: number;
  bestModeLabel: string;
  bestHrs: number;
  flight: CityModeCell | null;
  train: CityModeCell | null;
  bus: CityModeCell | null;
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideItineraryDay {
  heading: string;
  items: string[];
}

export interface DestinationGuideData {
  kind: "destination";
  d: Destination;
  shortName: string;
  title: string;
  fullDescription: string;
  metaDescription: string;
  touristTypes: string[];
  goodForText: string;
  vibeText: string;
  groundStay: number;
  groundFood: number;
  groundLocal: number;
  groundAct: number;
  dailyHostel: number;
  dailyBudget: number;
  dailyMid: number;
  dailyLuxury: number;
  cityRows: CityTripRow[];
  cheapestRow: CityTripRow;
  bestMonthsText: string;
  avoidMonthsText: string | null;
  climateText: string;
  itineraryDays: GuideItineraryDay[];
  howToReachText: string;
  similar: Destination[];
  faqs: GuideFaq[];
}

const GUIDE_CITY_IDS = [
  "delhi",
  "mumbai",
  "bengaluru",
  "kolkata",
  "chennai",
  "hyderabad",
] as const;

export function buildDestinationGuideData(
  slug: string
): DestinationGuideData | null {
  const d = DESTINATIONS.find((x) => x.id === slug);
  if (!d) return null;

  const shortName = d.name.split(" & ")[0];
  const touristTypes = d.for.map((g) => GROUP_LABELS[g]);
  const goodForText = touristTypes.join(", ");
  const vibeText = d.tags
    .map((t) => VIBES.find((v) => v.id === t)?.label || t)
    .join(", ");

  const groundStay = roundEven10((d.stay * 3) / 2);
  const groundFood = roundEven10(d.food * 4);
  const groundLocal = roundEven10((d.local / 2) * 4);
  const groundAct = roundEven10(d.act * 4 * 0.7);

  const dailyHostel = roundEven10(
    d.stay * 0.45 + d.food * 0.8 + d.local / 2 + d.act * 0.8
  );
  const dailyBudget = roundEven10(
    d.stay / 2 + d.food + d.local / 2 + d.act
  );
  const dailyMid = roundEven10(
    (d.stay * 2.3) / 2 + d.food * 1.6 + d.local / 2 + d.act * 1.3
  );
  const dailyLuxury = roundEven10(
    (d.stay * 5.5) / 2 + d.food * 3 + (d.local / 2) * 1.5 + d.act * 1.8
  );

  const cityRows: CityTripRow[] = [];
  for (const oid of GUIDE_CITY_IDS) {
    const origin = ORIGINS.find((o) => o.id === oid)!;
    if (hav(origin, d) < 40) continue;
    const baseS = {
      from: origin.id,
      days: 4,
      travelers: 2,
      group: "friends" as GroupType,
      stay: "budget" as const,
      transport: "any" as const,
      maxTravel: 24,
    };
    const opts = travelOptions(origin, d, baseS);
    const best = pickMode(opts, d, baseS);
    if (!best) continue;
    const cost = costsFor(d, best, "ok", baseS);

    const flightOpt = opts.find((o) => o.mode === "flight");
    const trainOpt = opts.find((o) => o.mode === "train");
    const busOpt = opts.find((o) => o.mode === "bus");

    cityRows.push({
      originId: origin.id,
      originName: origin.name,
      totalCost: roundEven10(cost.total),
      bestModeLabel: guideModeLabel(best.mode),
      bestHrs: best.hrs,
      flight: flightOpt
        ? { cost: roundEven10(flightOpt.cost), hrsLabel: hrsLabel(flightOpt.hrs) }
        : null,
      train: trainOpt
        ? { cost: roundEven10(trainOpt.cost), hrsLabel: hrsLabel(trainOpt.hrs) }
        : null,
      bus: busOpt
        ? { cost: roundEven10(busOpt.cost), hrsLabel: hrsLabel(busOpt.hrs) }
        : null,
    });
  }

  const cheapestRow = cityRows.reduce((a, b) =>
    a.totalCost <= b.totalCost ? a : b
  );

  const bestMonthsText = formatSortedMonths(d.best);
  const avoidMonthsText = d.avoid.length ? formatSortedMonths(d.avoid) : null;
  const climateText = CLIMATE_DESCRIPTIONS[d.clim];

  const title = `${d.name} Trip Plan 2026: Budget, 4-Day Itinerary & Best Time to Visit`;
  const fullDescription = `Plan a ${d.name} trip on a budget: 4-day itinerary, total cost (${fmt(cheapestRow.totalCost)} per person from ${cheapestRow.originName}), best time to visit (${bestMonthsText}), what to eat, tips and FAQs.`;
  const metaDescription = fullDescription.slice(0, 160);

  const itineraryDays: GuideItineraryDay[] = [
    {
      heading: "Day 1: Arrive & settle in",
      items: [
        "Arrive, check in and freshen up",
        d.hl[0],
        `Dinner: try ${d.eat[0]}`,
      ],
    },
    {
      heading: "Day 2: Explore",
      items: [
        d.hl[1],
        d.hl[2],
        ...(d.eat[1] ? [`Must eat: ${d.eat[1]}`] : []),
      ],
    },
    {
      heading: "Day 3: Explore",
      items: [
        d.hl[3],
        d.hl[4],
        ...(d.eat[2] ? [`Must eat: ${d.eat[2]}`] : []),
      ],
    },
    {
      heading: "Day 4: Last morning & head home",
      items: [d.hl[5], "Souvenir shopping, checkout and travel back"],
    },
  ];

  const reachPartsFaq: string[] = [];
  if (d.air === 0) reachPartsFaq.push("lands right in the city");
  else if (d.air != null)
    reachPartsFaq.push(`nearest useful airport about ${d.air} km away by road`);

  if (d.intl) {
    reachPartsFaq.push("international flights from major Indian cities");
  } else if (d.rail === 0) {
    reachPartsFaq.push("railway station in town");
  } else if (d.rail != null) {
    reachPartsFaq.push(`nearest railway station about ${d.rail} km away`);
  }

  const reachBase = reachPartsFaq.join("; ");
  const reachSectionBase =
    reachBase.charAt(0).toUpperCase() + reachBase.slice(1) + ".";
  const howToReachText = d.visa
    ? `${reachSectionBase} ${d.visa}.`
    : reachSectionBase;

  const top3Rows = cityRows.filter((r) =>
    ["delhi", "mumbai", "bengaluru"].includes(r.originId)
  );
  const top3Summary = top3Rows
    .map((r) => `${fmt(r.totalCost)} from ${r.originName}`)
    .join(", ");

  const familyAnswer =
    d.easy && d.for.includes("family")
      ? "Yes. It is easy to get around and works well for families."
      : d.noKids
        ? `It is best for ${goodForText}. It is high altitude, so rest a day on arrival.`
        : `It is best for ${goodForText}.`;

  const faqs: GuideFaq[] = [
    {
      q: `How much does a 4-day trip to ${d.name} cost?`,
      a: `With 2 people sharing a budget stay, a 4-day ${d.name} trip costs roughly ${top3Summary} per person, including return travel, stay, food, local transport and activities. Hostels bring it down; 3★–4★ hotels or flights push it up.`,
    },
    {
      q: `What is the best time to visit ${d.name}?`,
      a: `The best months are ${bestMonthsText}.${avoidMonthsText ? ` Avoid ${avoidMonthsText}, when it is off-season.` : ""} ${climateText}`,
    },
    {
      q: `How many days are enough for ${d.name}?`,
      a: `4 days covers the main sights comfortably: ${d.hl
        .slice(0, 3)
        .map((h) => h.split(":")[0])
        .join(", ")} and more. Add a day for ${d.near}.`,
    },
    {
      q: `Is ${d.name} good for families and kids?`,
      a: familyAnswer,
    },
    {
      q: `How do I reach ${d.name}?`,
      a: `${d.name}: ${reachBase}. From ${cheapestRow.originName}, the best-value option is ${cheapestRow.bestModeLabel.toLowerCase()} (about ${hrsLabel(cheapestRow.bestHrs)} each way).`,
    },
  ];

  if (d.intl && d.country && d.visa) {
    faqs.push({
      q: `Do Indians need a visa for ${d.country}?`,
      a: `${d.visa}. Always check the latest rules before booking.`,
    });
  }

  const similar = DESTINATIONS.filter((other) => other.id !== d.id)
    .map((other, idx) => ({
      other,
      idx,
      shared: other.tags.filter((t) => d.tags.includes(t)).length,
    }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.idx - b.idx)
    .slice(0, 6)
    .map((x) => x.other);

  return {
    kind: "destination",
    d,
    shortName,
    title,
    fullDescription,
    metaDescription,
    touristTypes,
    goodForText,
    vibeText,
    groundStay,
    groundFood,
    groundLocal,
    groundAct,
    dailyHostel,
    dailyBudget,
    dailyMid,
    dailyLuxury,
    cityRows,
    cheapestRow,
    bestMonthsText,
    avoidMonthsText,
    climateText,
    itineraryDays,
    howToReachText,
    similar,
    faqs,
  };
}

export interface BudgetGuideItem {
  d: Destination;
  modeLabel: string;
  hrsText: string;
  totalCost: number;
  bestMonthsText: string;
}

export interface BudgetGuideData {
  kind: "budget";
  def: BudgetGuideDef;
  title: string;
  description: string;
  items: BudgetGuideItem[];
  siblings: BudgetGuideDef[];
}

export function buildBudgetGuideData(slug: string): BudgetGuideData | null {
  const def = BUDGET_GUIDES.find((b) => b.slug === slug);
  if (!def) return null;

  const origin = ORIGINS.find((o) => o.id === def.originId)!;
  const items: BudgetGuideItem[] = [];

  for (const d of DESTINATIONS) {
    if (hav(origin, d) < 40) continue;
    const baseS = {
      from: origin.id,
      days: 4,
      travelers: 2,
      group: "friends" as GroupType,
      stay: "budget" as const,
      transport: "any" as const,
      maxTravel: 24,
    };
    const opts = travelOptions(origin, d, baseS);
    const mode = pickMode(opts, d, baseS);
    if (!mode || mode.hrs > 24) continue;
    const cost = costsFor(d, mode, "ok", baseS);
    if (cost.total <= def.limit) {
      items.push({
        d,
        modeLabel: guideModeLabel(mode.mode),
        hrsText: hrsLabel(mode.hrs),
        totalCost: roundEven10(cost.total),
        bestMonthsText: formatSortedMonths(d.best),
      });
    }
  }

  items.sort((a, b) => a.totalCost - b.totalCost);

  const siblings = [...BUDGET_GUIDES]
    .filter((b) => b.slug !== def.slug)
    .sort((a, b) => a.limit - b.limit);

  const title = `Best Trips Under ${def.limitLabel} from ${def.originName} (2026): ${items.length} Budget Getaways`;
  const description = `${items.length} trips you can do from ${def.originName} for under ${def.limitLabel} per person (4 days, 2 people sharing): total cost, travel time and best time to visit.`;

  return {
    kind: "budget",
    def,
    title,
    description,
    items,
    siblings,
  };
}

export function getAllGuideSlugs(): string[] {
  return [
    ...DESTINATIONS.map((d) => d.id),
    ...BUDGET_GUIDES.map((b) => b.slug),
  ];
}
