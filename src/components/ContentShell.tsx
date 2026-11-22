import React from "react";
import Link from "next/link";
import { withBasePath } from "@/lib/config";

interface ContentShellProps {
  children: React.ReactNode;
  showAppBand?: boolean;
  footerNote?: string;
}

const DEFAULT_FOOTER_NOTE =
  "Costs are planning estimates (2 people sharing, budget stays) based on typical 2026 prices. Check live fares and hotel prices before booking. Updated 2026-11-22.";

export function ContentShell({
  children,
  showAppBand = true,
  footerNote = DEFAULT_FOOTER_NOTE,
}: ContentShellProps) {
  return (
    <div className="safar-content">
      <header className="top">
        <Link className="brand" href="/">
          <span className="logo">✈︎</span>
          <b>Safar</b>
        </Link>
        <nav>
          <Link href="/guides/">Travel guides</Link>
          <Link href="/app/">📱 Get the app</Link>
          <Link className="cta" href="/">
            Plan my trip
          </Link>
        </nav>
      </header>

      <main className="wrap">{children}</main>

      {showAppBand && (
        <section className="appband">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={withBasePath("/icons/icon-192.png")}
            alt="Safar app"
            width={56}
            height={56}
          />
          <div>
            <b>Get the Safar app</b>
            <small>Plan trips in your budget, right from your home screen.</small>
          </div>
          <Link className="btn" href="/app/">
            🤖 Download APK
          </Link>
        </section>
      )}

      <footer className="foot">
        <p>
          <Link href="/">Safar · Smart trip planner</Link> ·{" "}
          <Link href="/guides/">All travel guides</Link> ·{" "}
          <Link href="/app/">Android app</Link>
        </p>
        <p className="small">{footerNote}</p>
      </footer>
    </div>
  );
}
