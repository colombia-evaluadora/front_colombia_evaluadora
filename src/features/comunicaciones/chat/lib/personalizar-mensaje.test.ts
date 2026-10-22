import { describe, expect, it } from "vitest"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { personalizarMensaje } from "@/features/comunicaciones/chat/lib/personalizar-mensaje"

// Forma neutra que difunde comms-service por el socket (igual para todos).
const base: Mensaje = {
  id: 10,
  conversacionId: 3,
  autor: { id: 7, nombre: "Luis", enLinea: true },
  esPropio: false,
  texto: "hola",
  fecha: "2026-10-15T10:00:00Z",
  adjunto: null,
  editado: false,
  fijado: false,
  menciones: [],
  meMenciona: false,
  reacciones: [{ emoji: "👍", total: 2, mia: false, personas: ["Ana", "Luis"], usuarios: [1, 7] }],
}

describe("personalizarMensaje", () => {
  it("calcula esPropio y mia desde autor.id y reacciones[].usuarios", () => {
    const delAutor = personalizarMensaje(base, 7)
    expect(delAutor.esPropio).toBe(true)
    expect(delAutor.reacciones?.[0].mia).toBe(true)
    const deOtro = personalizarMensaje(base, 2)
    expect(deOtro.esPropio).toBe(false)
    expect(deOtro.reacciones?.[0].mia).toBe(false)
  })

  it("meMenciona con mención directa o masiva, nunca en mensajes propios", () => {
    const directa = {
      ...base,
      menciones: [{ tipo: "USUARIO" as const, usuarioId: 1, nombre: "Ana" }],
    }
    expect(personalizarMensaje(directa, 1).meMenciona).toBe(true)
    expect(personalizarMensaje(directa, 2).meMenciona).toBe(false)
    const masiva = {
      ...base,
      menciones: [{ tipo: "TODOS" as const, usuarioId: null, nombre: "todos" }],
    }
    expect(personalizarMensaje(masiva, 2).meMenciona).toBe(true)
    expect(personalizarMensaje(masiva, 7).meMenciona).toBe(false)
  })

  it("sin userId respeta lo que mandó el servidor", () => {
    const delServidor = { ...base, esPropio: true }
    expect(personalizarMensaje(delServidor, null)).toBe(delServidor)
  })
})
