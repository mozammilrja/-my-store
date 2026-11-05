"use client"

import dynamic from "next/dynamic"
import { Component, type ReactNode } from "react"
import type { MapPoint } from "./route-map"

/** Leaflet needs `window`: the map loads in the browser only. */
const RouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-container-high" />,
})

/** A map failure must never take the tracking page down: show the empty panel instead. */
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn("Tracking map failed to load", error)
  }
  render() {
    if (this.state.failed)
      return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-1 pb-12 text-on-surface-variant" data-testid="track-map-unavailable">
          <span aria-hidden className="material-symbols-outlined text-[32px]">map</span>
          <span className="font-label-sm text-label-sm">Map unavailable</span>
        </div>
      )
    return this.props.children
  }
}

export function RouteMapLazy(props: { focus: MapPoint; origin: MapPoint | null; destination: MapPoint | null }) {
  return (
    <MapBoundary>
      <RouteMap {...props} />
    </MapBoundary>
  )
}
