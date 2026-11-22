import { describe, expect, it } from "vitest";
import { DESTINATIONS, ORIGINS, VIBES } from "../data";
import {
  buildHash,
  computeResults,
  createDefaults,
  evaluate,
  fromSlider,
  hrsLabel,
  itinerary,
  readHash,
  toSlider,
  waSafe,
} from "../engine";
import {
  buildBudgetGuideData,
  buildDestinationGuideData,
  getAllGuideSlugs,
  GUIDE_CATEGORIES,
} from "../guides";

describe("Safar data & engine parity", () => {
  it("contains all 22 origins, 12 vibes, 41 destinations, and 50 guide slugs", () => {
    expect(ORIGINS).toHaveLength(22);
    expect(VIBES).toHaveLength(12);
    expect(DESTINATIONS).toHaveLength(41);
    expect(getAllGuideSlugs()).toHaveLength(50);

    const categorizedIds = GUIDE_CATEGORIES.flatMap((c) => c.ids);
    expect(categorizedIds).toHaveLength(41);
    expect(new Set(categorizedIds).size).toBe(41);
  });

  it("matches exact Goa guide figures from reference goa.html", () => {
    const goa = buildDestinationGuideData("goa")!;
    expect(goa).not.toBeNull();
    expect(goa.groundStay).toBe(2250);
    expect(goa.groundFood).toBe(2800);
    expect(goa.groundLocal).toBe(1000);
    expect(goa.groundAct).toBe(1400);
    expect(goa.dailyHostel).toBe(1880);
    expect(goa.dailyBudget).toBe(2200);
    expect(goa.dailyMid).toBe(3740);
    expect(goa.dailyLuxury).toBe(7500);

    const byCity = Object.fromEntries(goa.cityRows.map((r) => [r.originId, r]));
    expect(byCity.delhi.totalCost).toBe(21050);
    expect(byCity.delhi.flight).toEqual({ cost: 12600, hrsLabel: "4½ hrs" });
    expect(byCity.delhi.train).toEqual({ cost: 6240, hrsLabel: "1d 14h" });
    expect(byCity.delhi.bus).toBeNull();

    expect(byCity.mumbai.totalCost).toBe(9620);
    expect(byCity.mumbai.flight).toEqual({ cost: 6070, hrsLabel: "3 hrs" });
    expect(byCity.mumbai.train).toEqual({ cost: 1710, hrsLabel: "11 hrs" });
    expect(byCity.mumbai.bus).toEqual({ cost: 1820, hrsLabel: "12½ hrs" });

    expect(byCity.bengaluru.totalCost).toBe(9980);
    expect(byCity.kolkata.totalCost).toBe(22420);
    expect(byCity.chennai.totalCost).toBe(11070);
    expect(byCity.hyderabad.totalCost).toBe(10180);

    expect(goa.cheapestRow.originId).toBe("mumbai");
    expect(goa.similar.map((s) => s.id)).toEqual([
      "alleppey",
      "thailand",
      "andaman",
      "coorg",
      "bali",
      "manali",
    ]);
  });

  it("matches exact Leh-Ladakh, Thailand, Dubai, Nepal, and Andaman guide figures", () => {
    const ladakh = buildDestinationGuideData("ladakh")!;
    expect(ladakh.dailyHostel).toBe(3180);
    expect(ladakh.dailyBudget).toBe(3550);
    expect(ladakh.dailyMid).toBe(5350);
    expect(ladakh.dailyLuxury).toBe(10180);
    expect(ladakh.cheapestRow).toMatchObject({ originId: "delhi", totalCost: 15950 });

    const thailand = buildDestinationGuideData("thailand")!;
    expect(thailand.cheapestRow).toMatchObject({ originId: "kolkata", totalCost: 34380 });
    expect(thailand.faqs).toHaveLength(6);

    const dubai = buildDestinationGuideData("dubai")!;
    expect(dubai.cheapestRow).toMatchObject({ originId: "mumbai", totalCost: 52060 });
    expect(dubai.dailyLuxury).toBe(24080);

    const nepal = buildDestinationGuideData("nepal")!;
    expect(nepal.cityRows.find((r) => r.originId === "delhi")?.totalCost).toBe(13710);

    const andaman = buildDestinationGuideData("andaman")!;
    expect(andaman.cheapestRow).toMatchObject({ originId: "kolkata", totalCost: 28940 });
  });

  it("matches exact budget trip lists for Delhi <10k and Bengaluru <25k", () => {
    const del10k = buildBudgetGuideData("trips-under-10000-from-delhi")!;
    expect(del10k.items).toHaveLength(9);
    expect(del10k.items.map((x) => x.d.id)).toEqual([
      "kasol",
      "amritsar",
      "rishikesh",
      "agra",
      "mcleodganj",
      "varanasi",
      "mussoorie",
      "jaipur",
      "shimla",
    ]);
    for (const [idx, expected] of [6420, 6600, 6890, 7190, 7310, 7730, 7840, 8120, 8310].entries()) {
      expect(Math.abs(del10k.items[idx].totalCost - expected)).toBeLessThanOrEqual(10);
    }

    const blr25k = buildBudgetGuideData("trips-under-25000-from-bengaluru")!;
    expect(blr25k.items).toHaveLength(23);
    expect(blr25k.items[0]).toMatchObject({ totalCost: 5980 });
    expect(blr25k.items[0].d.id).toBe("hampi");
    expect(blr25k.items[22].d.id).toBe("darjeeling");
    expect(blr25k.items[22].totalCost).toBe(24040);
  });

  it("round-trips slider, URL hash, live fare overrides, and WhatsApp safe formatting", () => {
    expect(fromSlider(toSlider(2000))).toBe(2000);
    expect(fromSlider(toSlider(1000000))).toBe(1000000);
    expect(Math.abs(fromSlider(toSlider(15000)) - 15000)).toBeLessThanOrEqual(500);
    expect(hrsLabel(0.5)).toBe("30 min");
    expect(hrsLabel(12.4)).toBe("12½ hrs");
    expect(hrsLabel(38)).toBe("1d 14h");

    const def = createDefaults(new Date("2026-11-15T00:00:00Z"));
    const next = { ...def, from: "mumbai", budget: 25000, vibes: ["beach", "food"], offbeat: true };
    const hash = buildHash(next, def, "goa");
    const parsed = readHash(hash, def)!;
    expect(parsed.trip).toBe("goa");
    expect(parsed.patch).toMatchObject({
      from: "mumbai",
      budget: 25000,
      vibes: ["beach", "food"],
      offbeat: true,
    });

    const { results } = computeResults(def);
    expect(results.length).toBeGreaterThan(10);

    const goaDest = DESTINATIONS.find((d) => d.id === "goa")!;
    const refDate = new Date("2026-11-15T00:00:00Z");
    const evLive = evaluate(
      goaDest,
      { ...def, transport: "flight" },
      {
        "DEL-GOI-2026-12": {
          status: "ok",
          data: {
            found: true,
            from: "DEL",
            to: "GOI",
            month: "2026-12",
            price: 6899,
            transfers: 0,
            link: "https://tp.media/r?test=1",
          },
        },
      },
      {},
      refDate
    );
    expect(evLive.mode?.live?.price).toBe(6899);
    expect(evLive.cost.travel).toBe(6899);
    expect(itinerary(evLive, def)).toHaveLength(4);
    expect(waSafe("🏖️ Goa ✈️ ₹9,620")).toBe("Goa ✈ ₹9,620");
  });
});
