// The admin's JavaScript modules the TypeScript portal code imports.
declare module "@/routes" {
  export const MODULE_ROUTES: { path: string; label: string; icon: string; detail?: string[] }[]
}
declare module "@/lib/theme" {
  export function toggleThemeGlobal(): void
}

// The admin's UI kit and page components (JSX), reused by the workspaces so
// every area shares one design system. Props are the admin components' own.
declare module "@/components/ui" {
  import type { ComponentType, ReactNode } from "react"
  type Any = ComponentType<Record<string, unknown> & { children?: ReactNode; className?: string }>
  export const Button: Any
  export const Badge: Any
  export const Card: Any
  export const Icon: Any
  export const Table: Any
  export const TableHeader: Any
  export const TableBody: Any
  export const TableRow: Any
  export const TableHead: Any
  export const TableCell: Any
  export const PageContainer: Any
  export const PageHeader: Any
  export const PageSection: Any
  export const ContentGrid: Any
  export const StatsCard: Any
  export const SectionCard: Any
  export const EmptyState: Any
  export const ErrorState: Any
  export const LoadingState: Any
  export const Skeleton: Any
  export const SkeletonCard: Any
  export const SkeletonStatsCard: Any
}
declare module "@/components/layout/BrandMark" {
  import type { ComponentType } from "react"
  export const BrandMark: ComponentType<{ src: string; label: string; align?: string; className?: string; "aria-hidden"?: string | boolean }>
}
