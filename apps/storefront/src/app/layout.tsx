import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getBaseURL } from "@lib/util/env"
import { STORE_NAME } from "@lib/util/site"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "styles/globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: `${STORE_NAME} | Everyday Style. Your Way.`,
    template: `%s | ${STORE_NAME}`,
  },
  description:
    "Everwear: Contemporary fashion and everyday essentials delivered across Europe and India.",
  applicationName: STORE_NAME,
}

export const viewport: Viewport = {
  themeColor: "#fbf9f8",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-mode="light"
      className={`${inter.variable}`}
    >
      <head />
      <body>
        <TooltipProvider>
          <main className="relative">{props.children}</main>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
