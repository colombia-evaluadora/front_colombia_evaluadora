import { describe, expect, it } from "vitest"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { buscarMensajes, resaltar, textoPlano } from "@/features/comunicaciones/chat/lib/buscar-mensajes"

const m = (id: number, texto: string, fecha: string, sistema = false) =>
  ({ id, texto, fecha, sistema }) as Mensaje

describe("textoPlano", () => {
  it("quita marcas de formato", () => {
    expect(textoPlano("*Hola* _mundo_\n- uno\n> cita")).toBe("Hola mundo uno cita")
  })
})

describe("buscarMensajes", () => {
  it("filtra sin distinguir mayúsculas, ignora avisos y ordena del más reciente", () => {
    const lista = [
      m(1, "Gracias", "2026-01-01T10:00:00Z"),
      m(2, "muchas *gracias*", "2026-01-02T10:00:00Z"),
      m(3, "gracias", "2026-01-03T10:00:00Z", true),
      m(4, "hola", "2026-01-04T10:00:00Z"),
    ]
    expect(buscarMensajes(lista, " GRACIAS ").map((x) => x.id)).toEqual([2, 1])
    expect(buscarMensajes(lista, "  ")).toEqual([])
  })
})

describe("resaltar", () => {
  it("marca cada aparición conservando el texto original", () => {
    expect(resaltar("Gracias, muchas gracias", "gracias")).toEqual([
      { texto: "Gracias", coincide: true },
      { texto: ", muchas ", coincide: false },
      { texto: "gracias", coincide: true },
    ])
  })
})
