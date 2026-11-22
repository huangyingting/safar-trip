import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, withBasePath } from "@/lib/config";
import { ContentShell } from "@/components/ContentShell";
import { InstallPwaButton } from "@/components/InstallPwaButton";

export const metadata: Metadata = {
  title: "Download Safar App for Android (Free APK) · Trip Planner",
  description:
    "Download the official Safar Android app (free, 1.5 MB APK). Plan trips in your budget across 40+ places in India & abroad with live flight prices and day-by-day itineraries.",
  alternates: {
    canonical: `${SITE_URL}${withBasePath("/app/")}`,
  },
  openGraph: {
    type: "website",
    title: "Download Safar for Android (Free APK)",
    description:
      "Plan a trip in your budget: 40+ destinations, real flight prices, cost breakdown and day-by-day itineraries.",
    url: `${SITE_URL}${withBasePath("/app/")}`,
    images: [`${SITE_URL}${withBasePath("/icons/icon-512.png")}`],
  },
};

export default function AndroidAppPage() {
  const apkHref = withBasePath("/downloads/safar-trip-planner.apk");
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Safar · Trip Planner",
    operatingSystem: "ANDROID",
    applicationCategory: "TravelApplication",
    softwareVersion: "1.0.1",
    downloadUrl: `${SITE_URL}${apkHref}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    description:
      "Budget-first trip planner for Indian travellers: 40+ destinations in India and abroad with real flight prices, cost breakdown and day-by-day itineraries.",
  };

  return (
    <ContentShell
      showAppBand={false}
      footerNote="Safar is free to use. Some booking links are affiliate links, so we may earn a small commission at no extra cost to you."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />

      <p className="crumbs">
        <Link href="/">Home</Link> › <span>Android app</span>
      </p>

      <div className="app-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={withBasePath("/icons/icon-512.png")}
          alt="Safar app icon"
          width={84}
          height={84}
        />
        <div className="txt">
          <h1>Safar · Trip Planner for Android</h1>
          <div>
            Tell Safar your budget, days and starting city, and see every trip you
            can actually afford.
          </div>
          <div className="app-meta">
            <span>Version 1.0.1</span>
            <span>· ~1.5 MB</span>
            <span>· Android 6.0+</span>
            <span>· Free · No ads, no sign-up</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          <a className="btn" href={apkHref} download>
            ⬇️ Download APK (1.5 MB)
          </a>
          <InstallPwaButton />
        </div>
      </div>

      <h2>What’s inside</h2>
      <ul>
        <li>
          <b>41 destinations in India &amp; abroad</b>: Goa, Manali, Ladakh,
          Kashmir, Kerala, Andaman, Thailand, Vietnam, Bali, Dubai and more.
        </li>
        <li>
          <b>Honest per-person budgets</b>: return flights / trains / buses +
          stay + food + local transport + activities, adjusted for your group and
          comfort level.
        </li>
        <li>
          <b>Live flight prices</b> where available, plus one-tap links to book
          flights, trains, buses, hotels, tours and travel eSIMs.
        </li>
        <li>
          <b>Day-by-day itinerary</b>, must-try local food, best months to visit,
          and one-tap WhatsApp group sharing.
        </li>
      </ul>

      <h2>How to install the APK (takes 30 seconds)</h2>
      <ol className="steps">
        <li>
          Tap <b>Download APK</b> above. Your browser may warn that APKs from
          outside Play Store need permission; tap <b>Download anyway</b>.
        </li>
        <li>
          Open the downloaded <b>safar-trip-planner.apk</b> from your
          notifications or <i>Downloads</i> folder.
        </li>
        <li>
          If Android asks, tap <b>Settings → Allow from this source</b>, then go
          back and tap <b>Install</b>.
        </li>
        <li>
          Tap <b>Open</b>. Safar always loads the latest destinations and live
          fares automatically; you won’t need to re-download for content updates.
        </li>
      </ol>
      <p className="shot-note">
        Google Play Store listing is on the way. Until then, this direct APK is
        signed by Safar and verified against our domain via Digital Asset Links.
      </p>

      <h2>Using an iPhone or laptop?</h2>
      <p>
        Safar works right in your browser, with no download needed. On iPhone,
        open <Link href="/">Safar in Safari</Link>, tap <b>Share ⬆︎ → Add to Home Screen</b>{" "}
        for the same full-screen app icon.
      </p>

      <h2>Is the APK safe?</h2>
      <p>
        Yes. It’s a lightweight Trusted Web Activity wrapper (~1.5 MB) that opens{" "}
        <code>safartripplanner.online</code> in full-screen Chrome with zero
        extra device permissions (no contacts, location, storage or background
        access).
      </p>
    </ContentShell>
  );
}
