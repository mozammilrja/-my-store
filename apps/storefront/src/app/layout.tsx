import { InstallPrompt } from "@/components/pwa/install-prompt"
import { PwaRegister } from "@/components/pwa/pwa-register"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getSiteMedia } from "@lib/data/site-media"
import { getBaseURL } from "@lib/util/env"
import { SiteMediaProvider } from "@lib/util/site-media"
import { STORE_NAME } from "@lib/util/site"
import { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import "styles/globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: `${STORE_NAME} | Fashion & Lifestyle`,
    template: `%s | ${STORE_NAME}`,
  },
  description:
    "AVELIQ: A premium fashion and lifestyle marketplace for India.",
  applicationName: STORE_NAME,
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Installed from Safari's Share menu: full screen, with the name under the icon.
  appleWebApp: { capable: true, title: STORE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  // Lets fixed bars use env(safe-area-inset-*) on phones with a notch or home indicator.
  viewportFit: "cover",
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const media = await getSiteMedia()
  return (
    <html
      lang="en"
      data-mode="light"
      className={`${inter.variable} ${display.variable}`}
    >
      <head>
        {/* The icon font is small (see scripts/build-icon-font.py) and used above the fold on every page. */}
        <link rel="preload" href="/fonts/material-symbols-outlined.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <SiteMediaProvider media={media}>
          <TooltipProvider>
            <main className="relative">{props.children}</main>
          </TooltipProvider>
        </SiteMediaProvider>
        <Toaster position="bottom-right" />
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  )
}
