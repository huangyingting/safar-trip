import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_URL, withBasePath } from "@/lib/config";
import { fmt } from "@/lib/engine";
import {
  BudgetGuideData,
  buildBudgetGuideData,
  buildDestinationGuideData,
  DestinationGuideData,
  formatSortedMonths,
  getAllGuideSlugs,
} from "@/lib/guides";
import { ContentShell } from "@/components/ContentShell";

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const canonicalUrl = `${SITE_URL}${withBasePath(`/guides/${slug}/`)}`;

  const destGuide = buildDestinationGuideData(slug);
  if (destGuide) {
    return {
      title: destGuide.title,
      description: destGuide.metaDescription,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: "article",
        siteName: "Safar Trip Planner",
        title: destGuide.title,
        description: destGuide.metaDescription,
        url: canonicalUrl,
        images: [`${SITE_URL}${withBasePath("/icons/icon-512.png")}`],
      },
      twitter: { card: "summary" },
    };
  }

  const budgetGuide = buildBudgetGuideData(slug);
  if (budgetGuide) {
    return {
      title: budgetGuide.title,
      description: budgetGuide.description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: "article",
        siteName: "Safar Trip Planner",
        title: budgetGuide.title,
        description: budgetGuide.description,
        url: canonicalUrl,
        images: [`${SITE_URL}${withBasePath("/icons/icon-512.png")}`],
      },
      twitter: { card: "summary" },
    };
  }

  return {};
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const destGuide = buildDestinationGuideData(slug);
  if (destGuide) {
    return <DestinationGuideArticle guide={destGuide} />;
  }

  const budgetGuide = buildBudgetGuideData(slug);
  if (budgetGuide) {
    return <BudgetGuideArticle guide={budgetGuide} />;
  }

  notFound();
}

function DestinationGuideArticle({ guide }: { guide: DestinationGuideData }) {
  const { d } = guide;
  const pageUrl = `${SITE_URL}${withBasePath(`/guides/${d.id}/`)}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.fullDescription,
    datePublished: "2026-11-22",
    dateModified: "2026-11-22",
    author: {
      "@type": "Organization",
      name: "Safar Trip Planner",
      url: `${SITE_URL}${withBasePath("/")}`,
    },
    publisher: {
      "@type": "Organization",
      name: "Safar Trip Planner",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}${withBasePath("/icons/icon-512.png")}`,
      },
    },
    mainEntityOfPage: pageUrl,
  };

  const destinationLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: d.name,
    description: d.desc,
    geo: {
      "@type": "GeoCoordinates",
      latitude: d.lat,
      longitude: d.lng,
    },
    touristType: guide.touristTypes,
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}${withBasePath("/")}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Travel guides",
        item: `${SITE_URL}${withBasePath("/guides/")}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: d.name,
        item: pageUrl,
      },
    ],
  };

  return (
    <ContentShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(destinationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <p className="crumbs">
        <Link href="/">Home</Link> › <Link href="/guides/">Travel guides</Link> ›{" "}
        <span>{d.name}</span>
      </p>

      <article>
        <h1>
          {d.emoji} {d.name} Trip Plan: Budget, Itinerary &amp; Best Time
        </h1>
        <p className="lead">{d.desc}</p>
        <Link className="btn" href={`/#trip=${d.id}`}>
          ✨ Plan my exact {guide.shortName} trip with live prices
        </Link>

        <div className="facts">
          <div>
            <small>Best time</small>
            <b>{guide.bestMonthsText}</b>
          </div>
          <div>
            <small>Budget per day</small>
            <b>{fmt(guide.dailyBudget)} / person</b>
          </div>
          <div>
            <small>Ideal trip</small>
            <b>4–5 days</b>
          </div>
          <div>
            <small>Good for</small>
            <b>{guide.goodForText}</b>
          </div>
          <div>
            <small>Vibe</small>
            <b>{guide.vibeText}</b>
          </div>
          <div>
            <small>Rating</small>
            <b>⭐ {d.rating}</b>
          </div>
        </div>

        <h2>How much does a {d.name} trip cost?</h2>
        <p>
          Per-person budget for a <b>4-day / 3-night</b> trip (2 people sharing a
          clean budget hotel, meals, local transport and activities, plus return
          travel from your city):
        </p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>Total / person</th>
                <th>Flight (return)</th>
                <th>Train 3AC (return)</th>
                <th>AC bus (return)</th>
              </tr>
            </thead>
            <tbody>
              {guide.cityRows.map((row) => (
                <tr key={row.originId}>
                  <td>
                    <b>{row.originName}</b>
                  </td>
                  <td>
                    <b>{fmt(row.totalCost)}</b>{" "}
                    <small>{row.bestModeLabel}</small>
                  </td>
                  <td>
                    {row.flight ? (
                      <>
                        {fmt(row.flight.cost)} <small>{row.flight.hrsLabel}</small>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {row.train ? (
                      <>
                        {fmt(row.train.cost)} <small>{row.train.hrsLabel}</small>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {row.bus ? (
                      <>
                        {fmt(row.bus.cost)} <small>{row.bus.hrsLabel}</small>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p>On the ground in {d.name} (excluding travel from your city), expect roughly:</p>
        <ul className="cost">
          <li>
            🏨 <b>Stay</b> (3 nights, twin-share): <b>{fmt(guide.groundStay)}</b>{" "}
            per person (~{fmt(d.stay)}/room/night)
          </li>
          <li>
            🍽️ <b>Food &amp; cafés</b> (4 days): <b>{fmt(guide.groundFood)}</b>{" "}
            (~{fmt(d.food)}/day)
          </li>
          <li>
            🚕 <b>Local transport</b>: <b>{fmt(guide.groundLocal)}</b> per person
          </li>
          <li>
            🎟️ <b>Tickets &amp; activities</b>: <b>{fmt(guide.groundAct)}</b>
          </li>
          {d.intl && d.visa && (
            <li>
              🛂 <b>Visa</b>: {d.visa}
            </li>
          )}
        </ul>

        <h3>Daily budget by comfort level</h3>
        <ul>
          <li>
            <b>Hostel / backpacker:</b> ~{fmt(guide.dailyHostel)} / person / day
          </li>
          <li>
            <b>Budget hotel:</b> ~{fmt(guide.dailyBudget)} / person / day
          </li>
          <li>
            <b>3★–4★ hotel:</b> ~{fmt(guide.dailyMid)} / person / day
          </li>
          <li>
            <b>Luxury / resort:</b> ~{fmt(guide.dailyLuxury)} / person / day
          </li>
        </ul>

        <h2>4-day {d.name} itinerary</h2>
        {guide.itineraryDays.map((day) => (
          <div key={day.heading}>
            <h3>{day.heading}</h3>
            <ul>
              {day.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <h2>Top things to do in {d.name}</h2>
        <ul>
          {d.hl.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>

        <h2>What to eat in {d.name}</h2>
        <ul>
          {d.eat.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>

        <h2>Best time to visit {d.name}</h2>
        <p>{guide.climateText}</p>
        <ul>
          <li>
            <b>Peak months:</b> {guide.bestMonthsText}
          </li>
          {guide.avoidMonthsText && (
            <li>
              <b>Months to avoid:</b> {guide.avoidMonthsText}
            </li>
          )}
        </ul>

        <h2>How to reach {d.name}</h2>
        <p>{guide.howToReachText}</p>
        <p>
          Easy day trip or add-on: <b>{d.near}</b>.
        </p>

        <h2>Local tips (and what to skip)</h2>
        <ul>
          {d.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
          {d.skip.map((s) => (
            <li key={s}>
              <b>Skip:</b> {s}
            </li>
          ))}
        </ul>

        <div className="ctabox">
          <b>Customise this trip in 10 seconds</b>
          <p>
            Pick your starting city, group size, month and comfort level to get
            live flight prices, transport comparisons and a shareable WhatsApp
            plan.
          </p>
          <Link className="btn" href={`/#trip=${d.id}`}>
            Plan my {guide.shortName} trip
          </Link>
        </div>

        <h2>Frequently asked questions</h2>
        <div className="faq">
          {guide.faqs.map((f, idx) => (
            <details key={f.q} open={idx === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>

        <h2>Similar trips to consider</h2>
        <div className="rels">
          {guide.similar.map((s) => (
            <Link key={s.id} className="rel" href={`/guides/${s.id}/`}>
              <span>{s.emoji}</span>
              <b>{s.name}</b>
              <small>
                {s.state} · Best: {formatSortedMonths(s.best)}
              </small>
            </Link>
          ))}
        </div>
      </article>
    </ContentShell>
  );
}

function BudgetGuideArticle({ guide }: { guide: BudgetGuideData }) {
  const { def, items, siblings } = guide;
  const pageUrl = `${SITE_URL}${withBasePath(`/guides/${def.slug}/`)}`;

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: guide.title,
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}${withBasePath(`/guides/${item.d.id}/`)}`,
      name: item.d.name,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}${withBasePath("/")}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Travel guides",
        item: `${SITE_URL}${withBasePath("/guides/")}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: def.shortLabel,
        item: pageUrl,
      },
    ],
  };

  return (
    <ContentShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <p className="crumbs">
        <Link href="/">Home</Link> › <Link href="/guides/">Travel guides</Link> ›{" "}
        <span>{def.shortLabel}</span>
      </p>

      <article>
        <h1>
          Best Trips Under {def.limitLabel} from {def.originName}
        </h1>
        <p className="lead">
          Looking for a budget trip from {def.originName}? These {items.length}{" "}
          destinations fit in <b>{def.limitLabel} per person</b> for a 4-day trip
          with 2 people sharing a budget room, including return travel, stay,
          food, local transport and activities. Sorted from cheapest.
        </p>
        <Link
          className="btn"
          href={`/#from=${def.originId}&budget=${def.limit}&days=4`}
        >
          ✨ See these on the map with live prices
        </Link>

        <div className="trips">
          {items.map((item) => (
            <Link
              key={item.d.id}
              className="trip"
              href={`/guides/${item.d.id}/`}
            >
              <span className="em">{item.d.emoji}</span>
              <span className="tx">
                <b>{item.d.name}</b>
                <small>
                  {item.d.state} · {item.modeLabel} {item.hrsText} · best{" "}
                  {item.bestMonthsText}
                </small>
              </span>
              <span className="pr">{fmt(item.totalCost)}</span>
            </Link>
          ))}
        </div>

        <div className="ctabox">
          <b>Different budget, dates or group size?</b>
          <p>
            Safar recalculates everything instantly, with filters for kids,
            elders, weather, vibe and travel time.
          </p>
          <Link className="btn" href={`/#from=${def.originId}&budget=${def.limit}`}>
            Open the planner
          </Link>
        </div>

        <h2>More budget trip lists</h2>
        <div className="chips">
          {siblings.map((sib) => (
            <Link key={sib.slug} className="chip" href={`/guides/${sib.slug}/`}>
              {sib.shortLabel}
            </Link>
          ))}
        </div>
      </article>
    </ContentShell>
  );
}
