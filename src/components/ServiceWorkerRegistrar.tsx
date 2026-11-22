"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/config";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(withBasePath("/sw.js"))
        .catch(() => {});
    }
  }, []);

  return null;
}
