import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getBaseURL } from "@lib/util/env"
import { STORE_NAME } from "@lib/util/site"
import { Metadata, Viewport } from "next"
import { Archivo, Inter_Tight } from "next/font/google"
import "styles/globals.css"

// Archivo's width axis gives the condensed, heavy headlines of the brand.
const displaySans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display-sans",
  display: "swap",
})

const body = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: STORE_NAME,
    template: `%s | ${STORE_NAME}`,
  },
  description:
    "Everwear: clothing and everyday essentials, delivered across Europe and India.",
  applicationName: STORE_NAME,
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-mode="light"
      className={`${displaySans.variable} ${body.variable}`}
    >
      <head>
      </head>
      <body>
        <TooltipProvider>
          <main className="relative">{props.children}</main>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
