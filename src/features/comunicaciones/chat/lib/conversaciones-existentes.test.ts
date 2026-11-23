import { describe, expect, it } from "vitest"

import type { Conversacion, DisponibilidadDirecto } from "@/features/comunicaciones/chat/api/types"
import { conversacionesExistentesPorPersona } from "@/features/comunicaciones/chat/lib/conversaciones-existentes"

const conv = (id: number, extra: Partial<Conversacion> = {}): Conversacion =>
  ({ id, nombre: `Persona ${id}`, asunto: `Asunto ${id}`, tipo: "DIRECTO", archivada: false, esBot: false, ...extra }) as Conversacion

const dir = (conversacionId: number, usuarioId: number): DisponibilidadDirecto => ({
  conversacionId,
  usuarioId,
  estado: "EN_LINEA",
})

describe("conversacionesExistentesPorPersona", () => {
  it("agrupa los directos vigentes por la otra persona, en el orden de la bandeja", () => {
    const r = conversacionesExistentesPorPersona([conv(1), conv(2), conv(3)], [dir(1, 10), dir(2, 20), dir(3, 10)], [10, 20])
    expect(r.get(10)).toEqual([
      { id: 1, asunto: "Asunto 1" },
      { id: 3, asunto: "Asunto 3" },
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
