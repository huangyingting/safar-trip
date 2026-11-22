import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, withBasePath } from "@/lib/config";
import { DESTINATIONS } from "@/lib/data";
import {
  BUDGET_GUIDES,
  formatSortedMonths,
  GUIDE_CATEGORIES,
} from "@/lib/guides";
import { ContentShell } from "@/components/ContentShell";

export const metadata: Metadata = {
  title:
    "40+ India & International Travel Guides (2026): Budget, Best Time & Itineraries | Safar",
  description:
    "Free, honest trip guides for 41 destinations in India and abroad: per-person budget from Delhi, Mumbai & Bengaluru, 4-day itinerary, best months to visit, food and local tips.",
  alternates: {
    canonical: `${SITE_URL}${withBasePath("/guides/")}`,
  },
  openGraph: {
    type: "article",
    siteName: "Safar Trip Planner",
    title:
      "40+ India & International Travel Guides (2026): Budget, Best Time & Itineraries | Safar",
    description:
      "Free, honest trip guides for 41 destinations in India and abroad: per-person budget from Delhi, Mumbai & Bengaluru, 4-day itinerary, best months to visit, food and local tips.",
    url: `${SITE_URL}${withBasePath("/guides/")}`,
    images: [`${SITE_URL}${withBasePath("/icons/icon-512.png")}`],
  },
  twitter: {
    card: "summary",
  },
};

export default function GuidesHubPage() {
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Safar Travel Guides",
    url: `${SITE_URL}${withBasePath("/guides/")}`,
    description:
      "Trip budgets, 4-day itineraries and best-time-to-visit guides for 41 destinations.",
  };

  const destMap = new Map(DESTINATIONS.map((d) => [d.id, d]));

  return (
    <ContentShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <p className="crumbs">
        <Link href="/">Home</Link> › <span>Travel guides</span>
      </p>

      <h1>Travel Guides: Budgets, Itineraries &amp; Best Time to Visit</h1>
      <p className="lead">
        Realistic 2026 per-person budgets, 4-day itineraries, food to try and
        honest tips for 41 destinations across India and nearby countries. Or{" "}
        <Link href="/">enter your exact city, dates and budget</Link> to compare
        everything on a live map.
      </p>

      <h2>Trips by budget</h2>
      <div className="chips">
        {BUDGET_GUIDES.map((b) => (
          <Link key={b.slug} className="chip" href={`/guides/${b.slug}/`}>
            {b.hubLabel}
          </Link>
        ))}
      </div>

      {GUIDE_CATEGORIES.map((cat) => (
        <section key={cat.title}>
          <h2>{cat.title}</h2>
          <div className="rels">
            {cat.ids.map((id) => {
              const d = destMap.get(id);
              if (!d) return null;
              return (
                <Link key={d.id} className="rel" href={`/guides/${d.id}/`}>
                  <span>{d.emoji}</span>
                  <b>{d.name}</b>
                  <small>
                    {d.state} · Best: {formatSortedMonths(d.best)}
                  </small>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </ContentShell>
  );
}
