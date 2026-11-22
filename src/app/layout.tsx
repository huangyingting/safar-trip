import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { SITE_URL, withBasePath } from "@/lib/config";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ff7a1a",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Safar · Smart Trip Planner — Plan a Trip in Your Budget (India & Abroad)",
  description:
    "Tell Safar your starting city, budget, days and group: see every destination you can actually afford on a 3D globe, with real flight prices, cost breakdown and a day-by-day itinerary.",
  alternates: {
    canonical: `${SITE_URL}${withBasePath("/")}`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    siteName: "Safar Trip Planner",
    title: "Safar · Plan a Trip in Your Budget",
    description:
      "Set your budget, days and starting city. Safar shows every trip in India & abroad that fits, with live flight prices and a day-by-day plan.",
    url: `${SITE_URL}${withBasePath("/")}`,
    images: [`${SITE_URL}${withBasePath("/icons/icon-512.png")}`],
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "Safar · Plan a Trip in Your Budget",
    description:
      "Destinations, real flight prices, full cost breakdown and a day-by-day itinerary, all inside your budget.",
    images: [`${SITE_URL}${withBasePath("/icons/icon-512.png")}`],
  },
  manifest: withBasePath("/manifest.webmanifest"),
  icons: {
    icon: [
      { url: withBasePath("/icons/favicon-32.png"), sizes: "32x32", type: "image/png" },
      { url: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: withBasePath("/icons/apple-touch-icon.png") }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Safar",
  },
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('safar-theme')||'light';if(t==='light')document.documentElement.setAttribute('data-theme','light');else document.documentElement.removeAttribute('data-theme');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className={plusJakartaSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistrar />
        <Script
          id="travelpayouts-emrld"
          strategy="afterInteractive"
          src="https://emrldtp.com/NTE2Njc1.js?t=516675"
        />
      </body>
    </html>
  );
}

