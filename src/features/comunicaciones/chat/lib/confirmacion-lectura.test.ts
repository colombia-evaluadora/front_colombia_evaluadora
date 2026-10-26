import { describe, expect, it } from "vitest"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { alertasDe, describirAlertas } from "@/features/comunicaciones/chat/lib/alertas"
import { estadoLectura } from "@/features/comunicaciones/chat/lib/estado-mensaje"
import { extraerMenciones, segmentarMenciones } from "@/features/comunicaciones/chat/lib/menciones"
import { puedeSolicitarConfirmacionLectura } from "@/features/comunicaciones/chat/lib/politica-chat"

const mensaje = (extra: Partial<Mensaje> = {}): Mensaje => ({
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

describe("confirmación de lectura", () => {
  const conv = { leidoHasta: 99, totalMiembros: 3 }

  it("usa el estado del servidor cuando el mensaje la pidió", () => {
    const conf = (estado: "ENVIADO" | "ENTREGADO" | "LEIDO") => ({
      estado,
      total: 2,
      entregados: 0,
      leidos: 0,
      lectores: [],
    })
    expect(estadoLectura(mensaje({ confirmacion: conf("ENTREGADO") }), conv)).toBe("ENTREGADO")
    expect(estadoLectura(mensaje({ confirmacion: conf("ENVIADO") }), conv)).toBe("ENVIADO")
    // Sin confirmación: el doble check de siempre por `leidoHasta`.
    expect(estadoLectura(mensaje(), conv)).toBe("LEIDO")
    expect(estadoLectura(mensaje({ esPropio: false, confirmacion: conf("LEIDO") }), conv)).toBeNull()
  })

  it("un estudiante no la exige a directivos", () => {
    expect(puedeSolicitarConfirmacionLectura("ESTUDIANTE", ["DOCENTE", "DIRECTIVO"])).toBe(false)
    expect(puedeSolicitarConfirmacionLectura("ESTUDIANTE", ["DOCENTE"])).toBe(true)
    expect(puedeSolicitarConfirmacionLectura("DOCENTE", ["DIRECTIVO"])).toBe(true)
  })
})

describe("alertas por conversación", () => {
  it("defecto: campana y sonido", () => {
    expect(alertasDe({})).toEqual({ campana: true, sonido: true, correo: false })
    expect(describirAlertas(alertasDe({}))).toBe("Campana y sonido")
  })

  it("el sonido solo cuenta con la campana", () => {
    expect(describirAlertas({ campana: false, sonido: true, correo: true })).toBe("Correo")
    expect(describirAlertas({ campana: true, sonido: true, correo: true })).toBe("Campana, sonido y correo")
    expect(describirAlertas({ campana: false, sonido: false, correo: false })).toBe("Sin avisos")
  })
})

describe("@canal es alias de @todos", () => {
  it("una sola mención masiva TODOS", () => {
    expect(extraerMenciones("@canal y @todos", [], true)).toEqual([{ tipo: "TODOS", usuarioId: null, nombre: "todos" }])
  })

  it("resalta @canal con la mención TODOS (y con una vieja CANAL)", () => {
    const todos = segmentarMenciones("hola @canal", [{ tipo: "TODOS", usuarioId: null, nombre: "todos" }])
    expect(todos.some((p) => p.tipo === "mencion")).toBe(true)
    const vieja = segmentarMenciones("hola @canal", [{ tipo: "CANAL", usuarioId: null, nombre: "todos" }])
    expect(vieja.some((p) => p.tipo === "mencion")).toBe(true)
  })
})
