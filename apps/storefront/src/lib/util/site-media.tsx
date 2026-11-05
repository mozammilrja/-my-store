"use client"

import { createContext, useCallback, useContext } from "react"
import { resolveSiteImage, type SiteMedia } from "./site-media-url"

const SiteMediaContext = createContext<SiteMedia>({})

/** Provided once in the root layout; the value never changes during a visit, so it causes no re-renders. */
export function SiteMediaProvider({ media, children }: { media: SiteMedia; children: React.ReactNode }) {
  return <SiteMediaContext.Provider value={media}>{children}</SiteMediaContext.Provider>
}

/** For client components: `const img = useSiteImage(); img("/images/men/hero.jpg")`. */
export function useSiteImage() {
  const media = useContext(SiteMediaContext)
  return useCallback((path: string) => resolveSiteImage(media, path), [media])
}
