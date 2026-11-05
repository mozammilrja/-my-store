// The admin's JavaScript modules the TypeScript portal code imports.
declare module "@/routes" {
  export const MODULE_ROUTES: { path: string; label: string; icon: string; detail?: string[] }[]
}
declare module "@/lib/theme" {
  export function toggleThemeGlobal(): void
}
