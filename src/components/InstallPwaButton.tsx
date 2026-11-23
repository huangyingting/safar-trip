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
    const win = window as Window & {
      __safarDeferredPrompt?: BeforeInstallPromptEvent | null;
    };
    if (win.__safarDeferredPrompt) {
      deferredRef.current = win.__safarDeferredPrompt;
      queueMicrotask(() => setAvailable(true));
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      win.__safarDeferredPrompt = bip;
      deferredRef.current = bip;
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
        const win = window as Window & {
          __safarDeferredPrompt?: BeforeInstallPromptEvent | null;
        };
        await deferredRef.current.prompt();
        try {
          await deferredRef.current.userChoice;
        } catch {}
        win.__safarDeferredPrompt = null;
        deferredRef.current = null;
        setAvailable(false);
      }}
    >
      Install from browser
    </button>
  );
}
