import type { MetadataRoute } from "next";

/** Web App Manifest — LifeOS installable PWA. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeOS — Second Brain & AI Personal Assistant",
    short_name: "LifeOS",
    description:
      "Satu portal untuk semua aspek hidup: Todo, Finance, Health, Mental, Spiritual, Business, dan lainnya — dengan AI personal assistant.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0a09",
    theme_color: "#0d9488",
    categories: ["productivity", "lifestyle", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Todo", url: "/todo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Finance", url: "/finance", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Insights", url: "/insights", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
