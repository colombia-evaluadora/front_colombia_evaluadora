import { describe, expect, it } from "vitest"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import type { Publicacion } from "@/features/comunicaciones/foros/api/types"
import {
  arbolRespuestas,
  estadosPublicacion,
  etiquetasDisponibles,
  extractoPlano,
  fusionarPublicacion,
  personalizarPublicacion,
  puedeResolver,
  puedeResponderEn,
  textoRespuestas,
} from "@/features/comunicaciones/foros/lib/foros"

const msg = (id: number, respuestaA: number | null = null, fecha = `2026-10-0${id}T10:00:00Z`): Mensaje => ({
  id,
  conversacionId: 900,
  autor: { id: id, nombre: `P${id}`, enLinea: false },
  esPropio: false,
  texto: `m${id}`,
  fecha,
  adjunto: null,
  editado: false,
  fijado: false,
  respuestaA: respuestaA ? { id: respuestaA, autor: "x", texto: "", eliminado: false } : null,
})

const pub = (extra: Partial<Publicacion> = {}): Publicacion => ({
  id: 1,
  foroId: 900,
  titulo: "Duda",
  autor: { id: 7, nombre: "Ana", enLinea: false },
  esPropia: false,
  fecha: "2026-10-01T00:00:00Z",
  ultimaActividad: "2026-10-01T00:00:00Z",
  respuestas: 0,
  reacciones: 0,
  fijada: false,
  cerrada: false,
  resuelta: false,
  solucionId: null,
  etiquetas: [],
  siguiendo: false,
  extracto: "",
  totalCount: 1,
  mensaje: null,
  ...extra,
})

describe("arbolRespuestas", () => {
  it("hila por respuestaA y deja en primer nivel las que citan algo que no está", () => {
    const arbol = arbolRespuestas([msg(3, 1), msg(1), msg(2), msg(4, 99), msg(5, 3)])
    expect(arbol.map((n) => n.mensaje.id)).toEqual([1, 2, 4])
    expect(arbol[0].hijas.map((n) => n.mensaje.id)).toEqual([3])
    expect(arbol[0].hijas[0].hijas.map((n) => n.mensaje.id)).toEqual([5])
  })

  it("una cita eliminada no anida", () => {
    const m = msg(2, 1)
    m.respuestaA = { id: 1, autor: "x", texto: "", eliminado: true }
    expect(arbolRespuestas([msg(1), m]).map((n) => n.mensaje.id)).toEqual([1, 2])
  })
})

describe("publicaciones", () => {
  it("personaliza esPropia por autor", () => {
    expect(personalizarPublicacion(pub(), 7).esPropia).toBe(true)
    expect(personalizarPublicacion(pub({ esPropia: true }), 8).esPropia).toBe(false)
    expect(personalizarPublicacion(pub({ esPropia: true }), null).esPropia).toBe(true)
  })

  it("el evento neutro conserva siguiendo, totalCount y el cuerpo ya cargado", () => {
    const cuerpo = msg(1)
    const prev = pub({ siguiendo: true, totalCount: 12, mensaje: cuerpo })
    const nueva = fusionarPublicacion(prev, pub({ respuestas: 3, siguiendo: false, totalCount: 1, mensaje: null }))
    expect(nueva).toMatchObject({ respuestas: 3, siguiendo: true, totalCount: 12, mensaje: cuerpo })
  })

  it("cerrada: solo la moderación responde", () => {
    expect(puedeResponderEn(pub(), { puedeResponder: true, puedeModerar: false })).toBe(true)
    expect(puedeResponderEn(pub({ cerrada: true }), { puedeResponder: true, puedeModerar: false })).toBe(false)
    expect(puedeResponderEn(pub({ cerrada: true }), { puedeResponder: false, puedeModerar: true })).toBe(true)
    expect(puedeResponderEn(pub(), { puedeResponder: false, puedeModerar: false })).toBe(false)
  })

  it("resolver: quien publicó o la moderación", () => {
    expect(puedeResolver(pub({ esPropia: true }), false)).toBe(true)
    expect(puedeResolver(pub(), true)).toBe(true)
    expect(puedeResolver(pub(), false)).toBe(false)
  })

  it("etiquetas de moderación solo para la moderación", () => {
    const etiquetas = [
      { id: 1, soloModeradores: false },
      { id: 2, soloModeradores: true },
    ]
    expect(etiquetasDisponibles(etiquetas, false).map((e) => e.id)).toEqual([1])
    expect(etiquetasDisponibles(etiquetas, true).map((e) => e.id)).toEqual([1, 2])
  })

  it("textos", () => {
    expect(extractoPlano("Hola <@12>,\n  revisa")).toBe("Hola @persona, revisa")
    expect(textoRespuestas(0)).toBe("Sin respuestas")
    expect(textoRespuestas(1)).toBe("1 respuesta")
    expect(textoRespuestas(4)).toBe("4 respuestas")
    expect(estadosPublicacion({ fijada: true, cerrada: true, resuelta: true })).toEqual(["FIJADA", "RESUELTA", "CERRADA"])
  })
})
