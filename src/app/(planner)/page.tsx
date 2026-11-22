import { SITE_URL, withBasePath } from "@/lib/config";
import { SafarPlanner } from "@/components/SafarPlanner";
import "./planner.css";

const WEB_APP_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Safar Trip Planner",
  url: `${SITE_URL}${withBasePath("/")}`,
  applicationCategory: "TravelApplication",
  operatingSystem: "Any, Android",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
  description:
    "Budget-first trip planner for Indian travellers: 40+ destinations in India and abroad with real flight prices, transport comparisons, full cost breakdown and day-by-day itineraries.",
};

export default function PlannerHomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEB_APP_LD) }}
      />
      <SafarPlanner />
    </>
  );
}
