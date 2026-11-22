"use client";

import React, { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPwaButton() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setAvailable(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!available) return null;

  return (
    <button
      id="pwaBtn"
      type="button"
      className="chip"
      style={{ cursor: "pointer", padding: "12px 16px" }}
      onClick={async () => {
        if (!deferredRef.current) return;
        await deferredRef.current.prompt();
        deferredRef.current = null;
        setAvailable(false);
      }}
    >
      Install from browser
    </button>
  );
}
