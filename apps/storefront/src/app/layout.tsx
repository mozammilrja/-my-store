import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getBaseURL } from "@lib/util/env"
import { STORE_NAME } from "@lib/util/site"
import { Metadata, Viewport } from "next"
import { Fraunces, Inter_Tight } from "next/font/google"
import "styles/globals.css"

const displaySerif = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  variable: "--font-display-serif",
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
    "My Store: clothing and everyday essentials, delivered across Europe and India.",
  applicationName: STORE_NAME,
}

export const viewport: Viewport = {
  themeColor: "#f6f3ec",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-mode="light"
      className={`${displaySerif.variable} ${body.variable}`}
    >
      <head>
        <link rel="ucp" href="/.well-known/ucp" />
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
