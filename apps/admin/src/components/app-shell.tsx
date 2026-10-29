import { useQueryClient } from "@tanstack/react-query"
import {
  BarChart3,
  ChevronsUpDown,
  LogOut,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react"
import { Fragment } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
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
import { useMe } from "@/hooks/use-me"
import { clearToken } from "@/lib/api"

type NavEntry = {
  label: string
  to: string
  icon: typeof Package
}

const NAV: { label: string; items: NavEntry[] }[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/", icon: BarChart3 }],
  },
  {
    label: "Store",
    items: [
      { label: "Orders", to: "/orders", icon: ShoppingCart },
      { label: "Products", to: "/products", icon: Package },
      { label: "Customers", to: "/customers", icon: Users },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard",
  orders: "Orders",
  products: "Products",
  customers: "Customers",
}

const isActivePath = (pathname: string, to: string) =>
  to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`)

const AppSidebar = () => {
  const location = useLocation()
  const { data } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const email = data?.email ?? ""
  const name = data?.name || email

  const logout = () => {
    // Tokens are stateless, so signing out is dropping ours and clearing what it fetched.
    clearToken()
    queryClient.clear()
    navigate("/login", { replace: true })
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
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
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={isActivePath(location.pathname, item.to)}
                    >
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
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
                <Avatar className="size-8">
                  <AvatarFallback>{(name || "?").charAt(0).toUpperCase()}</AvatarFallback>
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
  const segments = location.pathname.split("/").filter(Boolean)
  const crumbs = segments.length ? segments : [""]

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((segment, index) => (
                <Fragment key={`${segment}-${index}`}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {PAGE_TITLES[segment] ?? decodeURIComponent(segment)}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
