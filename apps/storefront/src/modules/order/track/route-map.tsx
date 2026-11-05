"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useState } from "react"
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet"

export type MapPoint = { label: string; lat: number; lng: number }

/** Small export-sized dot pins; names show on hover only. No marker images. */
const dot = (tone: "origin" | "destination") =>
  L.divIcon({
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    html: `<span class="block h-3 w-3 rounded-full ring-2 ring-white shadow ${tone === "origin" ? "bg-primary" : "bg-secondary"}"></span>`,
  })

const hereIcon = L.divIcon({
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: `<span class="relative block h-4 w-4">
    <span class="absolute inset-0 rounded-full bg-secondary opacity-60 animate-ping"></span>
    <span class="absolute inset-0.5 rounded-full bg-secondary ring-2 ring-white"></span>
  </span>`,
})

/**
 * A static, city-level street map like the export's map image: centred on
 * where the parcel is now (`focus`), with the warehouse and destination pins
 * and the dashed route between them (which may run off the panel). No zoom
 * or drag controls; the OSM attribution is rendered by the page.
 */
export default function RouteMap({ focus, origin, destination }: { focus: MapPoint; origin: MapPoint | null; destination: MapPoint | null }) {
  // A fresh container per mount, so a dev remount (StrictMode / fast refresh)
  // never re-initialises Leaflet on a node it already owns.
  const [mountKey] = useState(() => Math.random().toString(36).slice(2))
  if (!Number.isFinite(focus?.lat) || !Number.isFinite(focus?.lng)) return null
  return (
    <MapContainer
      key={mountKey}
      className="h-full w-full"
      center={[focus.lat, focus.lng]}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      style={{ background: "#eae8e7" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="grayscale contrast-[1.05] brightness-[1.04]" />
      {origin && destination && (
        <Polyline positions={[[origin.lat, origin.lng], [destination.lat, destination.lng]]} pathOptions={{ color: "#1b1c1b", weight: 2.5, dashArray: "6 6", opacity: 0.9 }} />
      )}
      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={dot("origin")} keyboard={false}>
          <Tooltip direction="top" offset={[0, -6]}>{origin.label}</Tooltip>
        </Marker>
      )}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={dot("destination")} keyboard={false}>
          <Tooltip direction="top" offset={[0, -6]}>{destination.label}</Tooltip>
        </Marker>
      )}
      <Marker position={[focus.lat, focus.lng]} icon={hereIcon} keyboard={false} zIndexOffset={1000}>
        <Tooltip direction="top" offset={[0, -8]}>{focus.label}</Tooltip>
      </Marker>
    </MapContainer>
  )
}
