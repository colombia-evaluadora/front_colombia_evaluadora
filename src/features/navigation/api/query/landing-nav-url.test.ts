import { describe, expect, it } from "vitest"

import { getLandingNavUrl } from "@/features/navigation/api/query/use-nav-items-query"

const items = [{ url: "/app/cobertura/matricula" }, { url: "/app/establecimiento-educativo/funcionarios" }, { url: "/app/asistencia" }]
const fallback = "/app/planeador/actividades"

describe("getLandingNavUrl", () => {
  it("en línea respeta el primer ítem del menú", () => {
    expect(getLandingNavUrl(items, { offline: false, fallback })).toBe("/app/cobertura/matricula")
  })
  it("sin red salta las pantallas solo en línea", () => {
    expect(getLandingNavUrl(items, { offline: true, fallback })).toBe("/app/asistencia")
  })
  it("sin red y sin menú usa el fallback", () => {
    expect(getLandingNavUrl([], { offline: true, fallback })).toBe(fallback)
  })
})
