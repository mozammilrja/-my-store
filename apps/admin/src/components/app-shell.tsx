import { useQueryClient } from "@tanstack/react-query"
import { ChevronsUpDown, LogOut } from "lucide-react"
import { Fragment } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/reui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useOperations } from "@/hooks/use-operations"
import { NAV } from "@/lib/modules"
import { useMe } from "@/hooks/use-me"
import { clearToken } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { LABEL_CAPS } from "@/lib/typography"
import { cn } from "@/lib/utils"

/** Each list section and what one of its records is called, for the trail. */
const SECTIONS: Record<string, { label: string; record: string }> = {
  orders: { label: "Orders", record: "Order" },
  products: { label: "Products", record: "Product" },
  customers: { label: "Customers", record: "Customer" },
  catalog: { label: "Catalog", record: "Group" },
  promotions: { label: "Promotions", record: "Code" },
  analytics: { label: "Analytics", record: "Report" },
  inventory: { label: "Inventory", record: "Item" },
  suppliers: { label: "Suppliers", record: "Supplier" },
  returns: { label: "Returns", record: "Return" },
  shipments: { label: "Shipments", record: "Shipment" },
  invoices: { label: "Tax & invoices", record: "Invoice" },
  payments: { label: "Payments", record: "Payment" },
  "credit-notes": { label: "Credit notes", record: "Credit note" },
  users: { label: "Users & roles", record: "User" },
  settings: { label: "Settings", record: "Section" },
}

type Crumb = { label: string; to?: string }

/**
 * Dashboard at the root, then a section, then one record. A record crumb is
 * named after its section ("Orders / Order") rather than showing its raw id;
 * the page header carries the specific title.
 */
const crumbsFor = (pathname: string): Crumb[] => {
  const [section, record] = pathname.split("/").filter(Boolean)

  if (!section) return [{ label: "Overview" }]

  const entry = SECTIONS[section]
  if (!entry) return [{ label: decodeURIComponent(section) }]

  return record
    ? [{ label: entry.label, to: `/${section}` }, { label: entry.record }]
    : [{ label: entry.label }]
}

const isActivePath = (pathname: string, to: string) =>
  to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`)

/** The page you are on takes the one brand fill; everything else stays quiet. */
const ACTIVE_ITEM =
  "data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground"

const AppSidebar = () => {
  const location = useLocation()
  const { data } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const operations = useOperations()
  const email = data?.email ?? ""
  const name = data?.name || email

  const logout = () => {
    // Tokens are stateless, so signing out is dropping ours and clearing what it fetched.
    clearToken()
    queryClient.clear()
    navigate("/login", { replace: true })
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-semibold">
                  E
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Everwear</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Store admin
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className={cn(LABEL_CAPS, "text-muted-foreground")}>
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActivePath(location.pathname, item.to)
                  const badge = operations.data ? item.badge?.(operations.data.attention) : null

                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={active}
                        className={ACTIVE_ITEM}
                      >
                        <Link to={item.to} aria-current={active ? "page" : undefined}>
                          <item.icon />
                          <span className="flex-1 truncate">{item.label}</span>
                          {!item.ready ? (
                            <Badge
                              variant="outline"
                              radius="full"
                              className={cn(
                                LABEL_CAPS,
                                "text-muted-foreground shrink-0 px-2 group-data-[collapsible=icon]:hidden",
                                active && "border-sidebar-primary-foreground/35 text-sidebar-primary-foreground"
                              )}
                            >
                              Soon
                            </Badge>
                          ) : null}
                          {badge ? (
                            <Badge
                              variant={active ? "outline" : `${badge.tone}-light`}
                              radius="full"
                              className={cn(
                                LABEL_CAPS,
                                "shrink-0 px-2 group-data-[collapsible=icon]:hidden",
                                active &&
                                  "border-sidebar-primary-foreground/35 bg-sidebar-primary-foreground/15 text-sidebar-primary-foreground"
                              )}
                            >
                              {badge.text}
                            </Badge>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {(name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-56">
                <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export const AppShell = () => {
  const location = useLocation()
  const crumbs = crumbsFor(location.pathname)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-card sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) => (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {crumb.to ? (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.to}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground hidden text-xs md:inline">
              {formatDate(new Date())}
            </span>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
