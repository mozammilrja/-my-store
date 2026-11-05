/** Slot key (the image's path under /images/) -> the URL to show. */
export type SiteMedia = Record<string, string>

/**
 * The URL for a storefront image. Paths under /images/ are slots managed in
 * the admin; anything else (product photos, uploads) passes through. A slot
 * the API didn't return keeps the shipped file.
 *
 * Plain module (no "use client"), so server and client code can both call it.
 */
export const resolveSiteImage = (media: SiteMedia, path: string) =>
  path.startsWith("/images/") ? (media[path.slice("/images/".length)] ?? path) : path
