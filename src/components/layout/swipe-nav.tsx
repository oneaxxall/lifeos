"use client";

import * as React from "react";

/** Event global untuk membuka navigasi mobile dari gesture swipe. */
export const OPEN_NAV_EVENT = "lifeos:open-nav";

/**
 * Gesture swipe — buka drawer navigasi mobile dengan 1 jari geser ke kanan
 * di mana saja di area konten (BUKAN dari tepi kiri — menghindari konflik
 * dengan gesture back Android/iOS).
 *
 * Aturan deteksi (hindari false-positive):
 * - 1 jari saja (2 jari = diabaikan)
 * - Delta X > 70px (geser cukup jauh)
 * - Delta Y < 50px (horizontal dominan — bukan scroll vertikal)
 * - Durasi < 600ms (geser cepat, bukan scroll pelan)
 * - Tidak dimulai dari input/textarea/select
 */
export function SwipeNav() {
  React.useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const el = e.target as HTMLElement | null;
      if (el && el.closest("input, textarea, select, [role='dialog'], [data-no-swipe]")) return;
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;
      tracking = false;
      if (dt < 600 && dx > 70 && Math.abs(dy) < 50) {
        window.dispatchEvent(new CustomEvent(OPEN_NAV_EVENT));
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  return null;
}
