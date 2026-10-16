import { describe, expect, it } from "vitest"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { upsertMensaje } from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"

const conVotacion = (miVoto: number | null, cierraEn = "2026-01-01T10:05:00Z"): Mensaje => ({
  id: 7,
  conversacionId: 1,
  autor: { id: 1, nombre: "Ana", enLinea: true },
  esPropio: false,
  texto: "",
  fecha: "2026-01-01T10:00:00Z",
  adjunto: null,
  editado: false,
  fijado: false,
  votacion: {
    pregunta: "¿Salida?",
    tipo: "SI_NO",
    minutos: 5,
    cierraEn,
    opciones: [
      { id: 1, etiqueta: "Sí", votos: 1 },
      { id: 2, etiqueta: "No", votos: 0 },
    ],
    miVoto,
  },
})

describe("upsertMensaje con votación rápida", () => {
  it("conserva el voto propio ante el evento neutro", () => {
    const [m] = upsertMensaje([conVotacion(1)], conVotacion(null))!
    expect(m.votacion?.miVoto).toBe(1)
  })

  it("lo descarta si la votación se editó (otro cierre)", () => {
    const [m] = upsertMensaje([conVotacion(1)], conVotacion(null, "2026-01-01T11:00:00Z"))!
    expect(m.votacion?.miVoto).toBeNull()
  })
})
