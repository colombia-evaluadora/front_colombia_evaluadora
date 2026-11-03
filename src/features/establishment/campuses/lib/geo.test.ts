import { describe, expect, it } from "vitest"

import {
  formatLocation,
  fromInfluenceArea,
  parseLocation,
  readInfluenceArea,
  sameInfluenceArea,
  selfIntersects,
  toInfluenceArea,
  validateInfluenceArea,
  type LatLng,
} from "@/features/establishment/campuses/lib/geo"

const cuadrado: LatLng[] = [
  [10.47, -73.26],
  [10.47, -73.25],
  [10.48, -73.25],
  [10.48, -73.26],
]

describe("ubicación", () => {
  it("lee y escribe 'latitud,longitud'", () => {
    expect(parseLocation("10.4769, -73.2505")).toEqual([10.4769, -73.2505])
    expect(formatLocation([10.4769, -73.2505])).toBe("10.476900,-73.250500")
  })

  it("los datos viejos o vacíos quedan sin ubicación", () => {
    expect(parseLocation("-")).toBeNull()
    expect(parseLocation("")).toBeNull()
    expect(parseLocation(null)).toBeNull()
    expect(parseLocation("100,-73")).toBeNull()
  })
})

describe("área de influencia", () => {
  it("pasa de vértices de Leaflet a GeoJSON cerrado en [lng, lat] y vuelve", () => {
    const area = toInfluenceArea(cuadrado)
    expect(area.coordinates[0]).toHaveLength(5)
    expect(area.coordinates[0][0]).toEqual([-73.26, 10.47])
    expect(area.coordinates[0][4]).toEqual(area.coordinates[0][0])
    expect(fromInfluenceArea(area)).toEqual(cuadrado)
  })

  it("detecta un polígono que se cruza (corbatín) como el SSO", () => {
    expect(selfIntersects(toInfluenceArea(cuadrado))).toBe(false)
    const corbatin: LatLng[] = [cuadrado[0], cuadrado[2], cuadrado[1], cuadrado[3]]
    expect(selfIntersects(toInfluenceArea(corbatin))).toBe(true)
    expect(validateInfluenceArea(toInfluenceArea(corbatin))).toBe("El área de influencia no puede cruzarse consigo misma.")
  })

  it("pide al menos 3 vértices distintos y acepta no tener área", () => {
    expect(validateInfluenceArea(toInfluenceArea([cuadrado[0], cuadrado[1], cuadrado[1]]))).toMatch(/3 vértices/)
    expect(validateInfluenceArea(null)).toBeNull()
    expect(validateInfluenceArea(toInfluenceArea(cuadrado))).toBeNull()
  })

  it("lee el área del detalle solo si es un polígono", () => {
    expect(readInfluenceArea(toInfluenceArea(cuadrado))).not.toBeNull()
    expect(readInfluenceArea({ type: "Point", coordinates: [1, 2] })).toBeNull()
    expect(readInfluenceArea(null)).toBeNull()
    expect(sameInfluenceArea(toInfluenceArea(cuadrado), toInfluenceArea(cuadrado))).toBe(true)
    expect(sameInfluenceArea(toInfluenceArea(cuadrado), null)).toBe(false)
  })
})
