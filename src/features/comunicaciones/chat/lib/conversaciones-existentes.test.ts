import { describe, expect, it } from "vitest"

import type { Conversacion, DisponibilidadDirecto } from "@/features/comunicaciones/chat/api/types"
import {
  avisoConversacionesExistentes,
  conversacionesExistentesPorPersona,
  unirNombres,
} from "@/features/comunicaciones/chat/lib/conversaciones-existentes"

const conv = (id: number, extra: Partial<Conversacion> = {}): Conversacion =>
  ({ id, nombre: `Persona ${id}`, asunto: `Asunto ${id}`, tipo: "DIRECTO", archivada: false, esBot: false, ...extra }) as Conversacion

const dir = (conversacionId: number, usuarioId: number): DisponibilidadDirecto => ({
  conversacionId,
  usuarioId,
  estado: "EN_LINEA",
})

describe("conversacionesExistentesPorPersona", () => {
  it("agrupa los directos vigentes por la otra persona, el más reciente primero", () => {
    const r = conversacionesExistentesPorPersona([conv(1), conv(2), conv(3)], [dir(1, 10), dir(2, 20), dir(3, 10)], [10, 20])
    expect(r.get(10)).toEqual([
      { id: 3, asunto: "Asunto 3" },
      { id: 1, asunto: "Asunto 1" },
    ])
    expect(r.get(20)).toEqual([{ id: 2, asunto: "Asunto 2" }])
  })

  it("ignora personas no elegidas, grupos, archivadas, bot, retiradas y directos sin contraparte", () => {
    const r = conversacionesExistentesPorPersona(
      [
        conv(1, { archivada: true }),
        conv(2, { esBot: true }),
        conv(3, { retirado: true }),
        conv(4, { tipo: "GRUPO" }),
        conv(5),
        conv(6),
      ],
      [dir(1, 10), dir(2, 10), dir(3, 10), dir(4, 10), dir(6, 99)],
      [10],
    )
    expect(r.size).toBe(0)
  })

  it("usa el nombre cuando el hilo no tiene asunto", () => {
    const r = conversacionesExistentesPorPersona([conv(1, { asunto: null })], [dir(1, 10)], [10])
    expect(r.get(10)).toEqual([{ id: 1, asunto: "Persona 1" }])
  })
})

describe("conversacionesExistentesPorPersona con contraparteId (QA 106)", () => {
  it("relaciona por contraparteId sin necesitar disponibilidad/directos", () => {
    const r = conversacionesExistentesPorPersona([conv(1, { contraparteId: 10 })], [], [10])
    expect(r.get(10)).toEqual([{ id: 1, asunto: "Asunto 1" }])
  })

  it("contraparteId gana sobre la fila de disponibilidad", () => {
    const r = conversacionesExistentesPorPersona([conv(1, { contraparteId: 20 })], [dir(1, 10)], [10, 20])
    expect(r.has(10)).toBe(false)
    expect(r.get(20)?.map((h) => h.id)).toEqual([1])
  })

  it("ordena por el último mensaje, no por id", () => {
    const um = (enviadoEn: string) => ({ ultimoMensaje: { enviadoEn } }) as Partial<Conversacion>
    const r = conversacionesExistentesPorPersona(
      [conv(5, { contraparteId: 10, ...um("2026-11-01T10:00:00Z") }), conv(2, { contraparteId: 10, ...um("2026-11-20T10:00:00Z") })],
      [],
      [10],
    )
    expect(r.get(10)?.map((h) => h.id)).toEqual([2, 5])
  })
})

describe("unirNombres", () => {
  it("une con comas e «y»", () => {
    expect(unirNombres([])).toBe("")
    expect(unirNombres(["Ana"])).toBe("Ana")
    expect(unirNombres(["Nelly Silva", "Rosa Rincón"])).toBe("Nelly Silva y Rosa Rincón")
    expect(unirNombres(["A", "B", "C"])).toBe("A, B y C")
  })
})

describe("avisoConversacionesExistentes", () => {
  const hilo = (id: number) => ({ id, asunto: `Asunto ${id}` })
  const nelly = { id: 10, nombre: "Nelly Silva" }
  const rosa = { id: 20, nombre: "Rosa Rincón" }
  const luis = { id: 30, nombre: "Luis Paz" }
  const existentes = new Map([
    [10, [hilo(1)]],
    [20, [hilo(4), hilo(2)]],
  ])

  it("Individual con una conversación", () => {
    expect(avisoConversacionesExistentes("INDIVIDUAL", [nelly], existentes)).toEqual({
      tipo: "INDIVIDUAL",
      texto: "Ya tiene una conversación con esta persona.",
      hilos: [hilo(1)],
    })
  })

  it("Individual con varias: cuenta y deja la más reciente primero (la abre «Abrir»)", () => {
    const a = avisoConversacionesExistentes("INDIVIDUAL", [rosa], existentes)
    expect(a).toEqual({ tipo: "INDIVIDUAL", texto: "Ya tiene 2 conversaciones con esta persona.", hilos: [hilo(4), hilo(2)] })
  })

  it("Enviar por separado: solo los nombres con conversación previa, en el orden del Para", () => {
    expect(avisoConversacionesExistentes("SEPARADO", [luis, rosa, nelly], existentes)).toEqual({
      tipo: "SEPARADO",
      nombres: ["Rosa Rincón", "Nelly Silva"],
    })
  })

  it("Grupal o sin conversaciones previas: sin aviso", () => {
    expect(avisoConversacionesExistentes("GRUPAL", [nelly, rosa], existentes)).toBeNull()
    expect(avisoConversacionesExistentes("INDIVIDUAL", [luis], existentes)).toBeNull()
    expect(avisoConversacionesExistentes("SEPARADO", [], existentes)).toBeNull()
  })
})
