import type { MetadataRoute } from "next"
import { STORE_NAME } from "@lib/util/site"

const REGION = (process.env.NEXT_PUBLIC_DEFAULT_REGION || "in").toLowerCase()

/**
 * Install as an app from the browser (Android: Chrome's install prompt;
 * iPhone: Share, Add to Home Screen). Served at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${STORE_NAME} | Fashion & Lifestyle`,
    short_name: STORE_NAME,
    description: "A premium fashion and lifestyle store for India.",
    start_url: `/${REGION}?source=pwa`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F1E9",
    theme_color: "#ffffff",
    lang: "en-IN",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop new arrivals", url: `/${REGION}/store?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Your bag", url: `/${REGION}/cart?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Your orders", url: `/${REGION}/account/orders?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  }
}
