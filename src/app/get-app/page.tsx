import type { Metadata } from "next";
import Link from "next/link";
import { withBasePath } from "@/lib/config";

export const metadata: Metadata = {
  title: "Downloading Safar for Android…",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GetAppRedirectPage() {
  const apkHref = withBasePath("/downloads/safar-trip-planner.apk");
  const autoDownloadScript = `(function(){try{window.location.replace(${JSON.stringify(apkHref)});}catch(e){}})();`;

  return (
    <div
      style={{
        minHeight: "100dvh",
        fontFamily:
          'var(--font-jakarta), "Plus Jakarta Sans", system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        background: "#07090e",
        color: "#eef1f7",
        margin: 0,
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <meta httpEquiv="refresh" content={`0; url=${apkHref}`} />
      <script dangerouslySetInnerHTML={{ __html: autoDownloadScript }} />
      <main style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 40 }}>📲</div>
        <h1 style={{ fontSize: 22, margin: "8px 0" }}>
          Starting your Safar download…
        </h1>
        <p style={{ color: "#9aa4b2", lineHeight: 1.5 }}>
          If the download didn’t start automatically, tap the button below. Once
          downloaded, open <b>safar-trip-planner.apk</b> to install.
        </p>
        <a
          href={apkHref}
          download
          style={{
            display: "inline-block",
            marginTop: 14,
            padding: "13px 22px",
            borderRadius: 12,
            background: "linear-gradient(135deg,#ff7a1a,#ffb547)",
            color: "#1d0e00",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ⬇️ Download APK (1.5 MB)
        </a>
        <p style={{ marginTop: 18 }}>
          <Link href="/app/" style={{ color: "#ffb547" }}>
            Install instructions &amp; iPhone option →
          </Link>
        </p>
      </main>
    </div>
  );
}
