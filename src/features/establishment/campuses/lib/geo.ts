/**
 * Ubicación y área de influencia de la sede (Regla 89), con el contrato del SSO
 * (V446): la ubicación es el texto "latitud,longitud" de `GEOREFERENCIACION`
 * (el mismo formato de TESTUDIANTE) y el área un GeoJSON Polygon de un solo
 * contorno, en [longitud, latitud] como manda GeoJSON (al revés que Leaflet).
 */

export type LatLng = [lat: number, lng: number]

export interface InfluenceArea {
  type: "Polygon"
  coordinates: [number, number][][]
}

/** Máximo de vértices que acepta el SSO (`fn_sed_validar_area`). */
export const MAX_AREA_VERTICES = 500

/** Centro de Colombia: donde arranca el mapa de una sede sin ubicación. */
export const COLOMBIA_CENTER: LatLng = [4.6, -74.08]

const LAT_LNG = /^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/

/** "10.47,-73.25" → [10.47, -73.25]; `null` si está vacía o no se puede leer (p. ej. datos viejos "-"). */
export function parseLocation(value: string | null | undefined): LatLng | null {
  const match = LAT_LNG.exec((value ?? "").trim())
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null
}

/** [lat, lng] → "lat,lng" con 6 decimales (~10 cm): suficiente y estable al comparar. */
export function formatLocation([lat, lng]: LatLng): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`
}

/** Vértices de Leaflet ([lat, lng], sin repetir el primero) → GeoJSON cerrado. */
export function toInfluenceArea(vertices: LatLng[]): InfluenceArea {
  const ring = vertices.map(([lat, lng]) => [Number(lng.toFixed(6)), Number(lat.toFixed(6))] as [number, number])
  return { type: "Polygon", coordinates: [[...ring, ring[0]]] }
}

/** GeoJSON → vértices de Leaflet, sin el punto de cierre. */
export function fromInfluenceArea(area: InfluenceArea | null | undefined): LatLng[] {
  const ring = area?.coordinates?.[0] ?? []
  return ring.slice(0, -1).map(([lng, lat]) => [lat, lng])
}

/** El valor de `area_influencia` del detalle, si es un polígono que se puede pintar. */
export function readInfluenceArea(value: unknown): InfluenceArea | null {
  const area = value as InfluenceArea | null
  if (area?.type !== "Polygon" || !Array.isArray(area.coordinates?.[0])) return null
  return area.coordinates[0].length >= 4 ? area : null
}

/** Producto cruz (b - a) × (c - a): de qué lado de la recta ab queda c. */
function side(a: [number, number], b: [number, number], c: [number, number]) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

/**
 * Si dos lados no contiguos del polígono se cortan: la misma prueba de
 * `fn_sed_validar_area` en el SSO, para avisar antes de guardar.
 */
export function selfIntersects(area: InfluenceArea): boolean {
  const ring = area.coordinates[0]
  const n = ring.length - 1
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue
      const d1 = side(ring[j], ring[j + 1], ring[i])
      const d2 = side(ring[j], ring[j + 1], ring[i + 1])
      const d3 = side(ring[i], ring[i + 1], ring[j])
      const d4 = side(ring[i], ring[i + 1], ring[j + 1])
      if (d1 * d2 < 0 && d3 * d4 < 0) return true
    }
  }
  return false
}

/** Mensaje del primer problema del área (los del SSO), o `null` si se puede guardar. */
export function validateInfluenceArea(area: InfluenceArea | null): string | null {
  if (!area) return null
  const vertices = new Set(fromInfluenceArea(area).map(([lat, lng]) => `${lat},${lng}`))
  if (vertices.size < 3) return "El área de influencia necesita al menos 3 vértices distintos."
  if (area.coordinates[0].length - 1 > MAX_AREA_VERTICES) {
    return `El área de influencia debe tener entre 3 y ${MAX_AREA_VERTICES} vértices.`
  }
  if (selfIntersects(area)) return "El área de influencia no puede cruzarse consigo misma."
  return null
}

/** Si dos áreas son la misma (para no reenviar un área que no cambió). */
export function sameInfluenceArea(a: InfluenceArea | null, b: InfluenceArea | null): boolean {
  return JSON.stringify(a?.coordinates ?? null) === JSON.stringify(b?.coordinates ?? null)
}
