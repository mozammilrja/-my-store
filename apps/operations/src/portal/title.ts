import { useEffect } from "react"
import { useLocation } from "react-router"
import { MODULE_ROUTES } from "@/routes"
import { AREA_PAGES, pageLabel } from "./destinations"
import { AREA_LABEL, type Area } from "./session"

/*
 * The browser tab names the page and its workspace, e.g.
 * "Orders · Warehouse | AVELIQ", "Account & security · Seller Hub | AVELIQ",
 * from the same labels as the breadcrumbs and the sidebars.
 */
const BRAND = "AVELIQ"
const PUBLIC: Record<string, string> = {
  "/login": "Sign in",
  "/forgot-password": "Reset your password",
  "/reset-password": "Choose a new password",
  "/delivery/register": "Join as a delivery partner",
  "/seller/register": "Sell on Everwear",
}

export function titleFor(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/"
  if (PUBLIC[path]) return `${PUBLIC[path]} | ${BRAND}`
  const area = path.split("/")[1] as Area
  if (!AREA_LABEL[area]) return `Operations | ${BRAND}`
  const modules = MODULE_ROUTES as { path: string; label: string }[]
  const page = pageLabel(path, modules) ?? (area === "admin" ? modules[0]?.label : AREA_PAGES[area as Exclude<Area, "admin">]?.[0]?.label)
  return `${page ? `${page} · ` : ""}${AREA_LABEL[area]} | ${BRAND}`
}

export function usePageTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = titleFor(pathname)
  }, [pathname])
}
