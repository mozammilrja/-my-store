import "server-only"
import { cache } from "react"
import { api } from "../api/client"
import { resolveSiteImage, type SiteMedia } from "../util/site-media-url"

/**
 * The storefront's banner and editorial images, managed in the admin
 * (Site Media). One request per minute at most, shared by every page; if the
 * API can't answer, each image falls back to the file the storefront ships.
 */
export const getSiteMedia = cache(async (): Promise<SiteMedia> => {
  try {
    return (await api<{ media: SiteMedia }>("/store/site-media", { cache: { revalidate: 60, tags: ["site-media"] } })).media
  } catch {
    return {}
  }
})

/** For server components: `const img = await siteImages(); img("/images/men/hero.jpg")`. */
export const siteImages = async () => {
  const media = await getSiteMedia()
  return (path: string) => resolveSiteImage(media, path)
}
