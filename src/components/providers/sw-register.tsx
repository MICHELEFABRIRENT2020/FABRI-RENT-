"use client";

import { useEffect } from "react";

/** Registers public/sw.js so the app can be installed as a PWA (section 33-34). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline/installable support is a progressive enhancement - never block the app on it.
    });
  }, []);

  return null;
}
