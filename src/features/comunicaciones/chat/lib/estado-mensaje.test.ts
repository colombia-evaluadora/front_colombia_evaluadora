import { describe, expect, it } from "vitest"

import type { Mensaje, VotacionRapida } from "@/features/comunicaciones/chat/api/types"
import {
  agregarReciente,
  comoEliminado,
  estadoLectura,
  haceCuanto,
  marcaEdicion,
  mensajesFijados,
  puedeVerEliminados,
  votacionModificada,
} from "@/features/comunicaciones/chat/lib/estado-mensaje"

const base = (extra: Partial<Mensaje> = {}): Mensaje => ({
  id: 10,
  conversacionId: 1,
  autor: { id: 1, nombre: "Ana", enLinea: true },
  esPropio: true,
  texto: "hola",
  fecha: "2026-01-01T10:00:00Z",
  adjunto: null,
  editado: false,
  fijado: false,
  ...extra,
})

describe("puedeVerEliminados", () => {
  it("administrador o directivo en foros y grupos; nadie en un DM", () => {
    expect(puedeVerEliminados({ tipo: "CANAL", esAdmin: true }, "DOCENTE")).toBe(true)
    expect(puedeVerEliminados({ tipo: "GRUPO", esAdmin: false }, "DIRECTIVO")).toBe(true)
    expect(puedeVerEliminados({ tipo: "CANAL", esAdmin: false }, "DOCENTE")).toBe(false)
    expect(puedeVerEliminados({ tipo: "DIRECTO", esAdmin: true }, "DIRECTIVO")).toBe(false)
    expect(puedeVerEliminados(undefined, "DIRECTIVO")).toBe(false)
  })
})

describe("comoEliminado", () => {
  it("deja el aviso sin nada del contenido", () => {
    const m = comoEliminado(
      base({ adjunto: { nombre: "a.pdf", formato: "PDF", eliminadoEn: null }, fijado: true }),
      "2026-01-01T10:05:00Z",
    )
    expect(m).toMatchObject({ eliminado: true, texto: "", adjunto: null, fijado: false })
    expect(m.eliminadoEn).toBe("2026-01-01T10:05:00Z")
  })
})

describe("estadoLectura", () => {
  const conv = { totalMiembros: 2, leidoHasta: 10 }
  it("✓✓ si todos leyeron hasta el mensaje, ✓ si no", () => {
    expect(estadoLectura(base(), conv)).toBe("LEIDO")
    expect(estadoLectura(base({ id: 11 }), conv)).toBe("ENVIADO")
    expect(estadoLectura(base(), { totalMiembros: 2, leidoHasta: null })).toBe("ENVIADO")
  })
  it("sin marca en mensajes ajenos, de sistema, borrados o sin nadie más", () => {
    expect(estadoLectura(base({ esPropio: false }), conv)).toBeNull()
    expect(estadoLectura(base({ sistema: true }), conv)).toBeNull()
    expect(estadoLectura(base({ eliminado: true }), conv)).toBeNull()
    expect(estadoLectura(base(), { totalMiembros: 1, leidoHasta: 10 })).toBeNull()
  })
})

describe("marcaEdicion", () => {
  it("prefijo con la hora de la edición", () => {
    expect(marcaEdicion({ editado: false })).toBeNull()
    expect(marcaEdicion({ editado: true })).toBe("Editado")
    expect(marcaEdicion({ editado: true, editadoEn: "2026-01-01T12:33:00" })).toBe(
      "Editado 12:33 PM",
    )
  })
})

describe("haceCuanto", () => {
  const ahora = Date.parse("2026-01-01T10:00:00Z")
  it("minutos y horas", () => {
    expect(haceCuanto("2026-01-01T09:59:40Z", ahora)).toBe("hace un momento")
    expect(haceCuanto("2026-01-01T09:58:00Z", ahora)).toBe("hace 2 min")
    expect(haceCuanto("2026-01-01T08:00:00Z", ahora)).toBe("hace 2 horas")
  })
})

describe("mensajesFijados", () => {
  it("solo fijados vivos, el más reciente primero", () => {
    const lista = [
      base({ id: 1, fijado: true }),
      base({ id: 2 }),
      base({ id: 3, fijado: true }),
      base({ id: 4, fijado: true, eliminado: true }),
    ]
    expect(mensajesFijados(lista).map((m) => m.id)).toEqual([3, 1])
  })
})

describe("votacionModificada", () => {
  const v: VotacionRapida = {
    pregunta: "¿?",
    tipo: "SI_NO",
    minutos: 5,
    cierraEn: "2026-01-01T10:05:00Z",
    opciones: [],
    miVoto: null,
  }
  it("solo a quien vota, mientras esté abierta y sin haber vuelto a votar", () => {
    expect(votacionModificada(base({ editado: true, esPropio: false }), v, true)).toBe(true)
    expect(votacionModificada(base({ editado: true, esPropio: true }), v, true)).toBe(false)
    expect(
      votacionModificada(base({ editado: true, esPropio: false }), { ...v, miVoto: 1 }, true),
    ).toBe(false)
    expect(votacionModificada(base({ editado: true, esPropio: false }), v, false)).toBe(false)
    expect(votacionModificada(base({ esPropio: false }), v, true)).toBe(false)
  })
})

describe("agregarReciente", () => {
  it("la última primero, sin repetir y máximo 5", () => {
    expect(agregarReciente(["601", "802"], "802")).toEqual(["802", "601"])
    expect(agregarReciente(["a1", "b2", "c3", "d4", "e5"], "f6")).toEqual([
      "f6",
      "a1",
      "b2",
      "c3",
      "d4",
    ])
    expect(agregarReciente(["601"], " x ")).toEqual(["601"])
  })
})
