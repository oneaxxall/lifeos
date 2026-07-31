"use client";

import * as React from "react";

/**
 * Registrasi service worker untuk PWA.
 * Hanya di production (dev mode SW mengganggu hot-reload).
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Abaikan — PWA tetap jalan tanpa SW
      });
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
