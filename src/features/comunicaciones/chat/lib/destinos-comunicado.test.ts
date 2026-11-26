import { describe, expect, it } from "vitest"

import {
  aDestinos,
  deDestinos,
  DESTINOS_VACIOS,
  hayDestinos,
  resumenDestinatarios,
} from "@/features/comunicaciones/chat/lib/destinos-comunicado"

describe("destinos del comunicado con filtros de alcance", () => {
  const local = {
    ...DESTINOS_VACIOS,
    grupal: {
      grados: [],
      grupos: [{ valor: "601", etiqueta: "Sexto 601", detalle: "Sede principal", total: 5 }],
      roles: [],
      para: "ESTUDIANTES" as const,
    },
    filtros: {
      establecimiento: { valor: "1", etiqueta: "IE Simón Bolívar" },
      sede: { valor: "10", etiqueta: "Sede principal" },
      jornada: { valor: "3", etiqueta: "Mañana" },
    },
  }

  it("viajan como ESTABLECIMIENTO / SEDES / JORNADAS y vuelven igual (borrador o edición)", () => {
    const d = aDestinos(local)
    expect(d.establecimiento).toEqual({ valor: "1", etiqueta: "IE Simón Bolívar" })
    expect(d.sedes).toEqual([{ valor: "10", etiqueta: "Sede principal" }])
    expect(d.jornadas).toEqual([{ valor: "3", etiqueta: "Mañana" }])
    expect(deDestinos(d).filtros).toEqual(local.filtros)
  })

  it("los filtros solos no son destinatarios", () => {
    expect(hayDestinos({ ...DESTINOS_VACIOS, filtros: local.filtros })).toBe(false)
    expect(hayDestinos(local)).toBe(true)
  })

  it("un comunicado anterior (sin filtros) se lee sin filtros", () => {
    const viejo = { grados: [], grupos: [], roles: [], usuarios: [], gruposChat: [], para: "ESTUDIANTES" as const }
    expect(deDestinos(viejo).filtros).toEqual({ establecimiento: null, sede: null, jornada: null })
    // Sin filtros no se agregan claves: el JSON queda igual que antes (borradores y ediciones lo comparan).
    expect(aDestinos(deDestinos(viejo))).toEqual(viejo)
  })

  it("'Dirigido a' dice dónde se acotó", () => {
    expect(resumenDestinatarios(["ESTUDIANTES"], aDestinos(local))).toBe(
      "Estudiantes, grupo Sexto 601 · Sede principal, solo en IE Simón Bolívar, sede Sede principal, jornada Mañana",
    )
  })
})
