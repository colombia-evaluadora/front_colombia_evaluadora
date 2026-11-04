import { env } from "@/config/env"

import type { LatLng } from "@/features/establishment/campuses/lib/geo"

/** Qué tan cerca quedó el punto: con la dirección exacta, solo el barrio o solo el municipio. */
export type GeocodePrecision = "address" | "neighborhood" | "municipality"

export interface GeocodeResult {
  location: LatLng
  precision: GeocodePrecision
}

export interface GeocodeInput {
  address: string
  neighborhood?: string
  municipality?: string
  department?: string
}

interface NominatimRow {
  lat: string
  lon: string
}

// La política de uso de Nominatim permite 1 petición por segundo y pide no
// repetir la misma consulta: se espera entre una y otra y se guarda la respuesta.
const MIN_INTERVAL_MS = 1100
const cache = new Map<string, LatLng | null>()
const CACHE_KEY = "geocode-cache"
let lastRequestAt = 0

function readSessionCache(query: string): LatLng | null | undefined {
  try {
    const stored = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, LatLng | null>
    return query in stored ? stored[query] : undefined
  } catch {
    return undefined
  }
}

function writeSessionCache(query: string, value: LatLng | null) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, LatLng | null>
    stored[query] = value
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(stored))
  } catch {
    // Sin sessionStorage (ventana privada) basta el caché en memoria.
  }
}

async function search(query: string): Promise<LatLng | null> {
  const cached = cache.get(query) ?? readSessionCache(query)
  if (cached !== undefined) return cached

  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()

  const url = new URL(env.GEOCODER_URL)
  url.searchParams.set("q", query)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "1")
  url.searchParams.set("countrycodes", "co")
  url.searchParams.set("accept-language", "es")
  const response = await fetch(url, { headers: { Accept: "application/json" } })
  if (!response.ok) throw new Error("No fue posible consultar el mapa. Intente de nuevo en un momento.")
  const [row] = (await response.json()) as NominatimRow[]
  const location: LatLng | null = row ? [Number(row.lat), Number(row.lon)] : null
  cache.set(query, location)
  writeSessionCache(query, location)
  return location
}

const join = (...parts: (string | undefined)[]) =>
  parts.map((part) => part?.trim()).filter(Boolean).concat("Colombia").join(", ")

/**
 * Ubica la sede con su dirección (Regla 89). Las direcciones colombianas
 * ("Calle 10 # 4-20") no siempre se encuentran en OpenStreetMap: entonces se
 * busca el barrio y, si tampoco, el municipio, y se dice qué tan cerca quedó
 * para que quien edita corrija el punto arrastrándolo. `null` si no hay nada.
 */
export async function geocodeCampusAddress(input: GeocodeInput): Promise<GeocodeResult | null> {
  const attempts: [GeocodePrecision, string | null][] = [
    ["address", input.address.trim() ? join(input.address, input.neighborhood, input.municipality, input.department) : null],
    ["neighborhood", input.neighborhood?.trim() ? join(input.neighborhood, input.municipality, input.department) : null],
    ["municipality", input.municipality?.trim() ? join(input.municipality, input.department) : null],
  ]
  for (const [precision, query] of attempts) {
    if (!query) continue
    const location = await search(query)
    if (location) return { location, precision }
  }
  return null
}
