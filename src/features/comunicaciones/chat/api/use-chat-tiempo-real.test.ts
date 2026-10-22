import { describe, expect, it } from "vitest"

import { QueryClient } from "@tanstack/react-query"

import type { Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { puedeAgregarParticipantes, type PoliticaChat } from "@/features/comunicaciones/chat/lib/politica-chat"
import { aplicarEventoUsuario, upsertMensaje } from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"

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

describe("aplicarEventoUsuario (bandeja personal)", () => {
  const conv = (id: number, nombre = `c${id}`) =>
    ({ id, nombre, tipo: "GRUPO", categoria: "GENERAL", noLeidos: 0, actividadAbierta: false, esBot: false,
      totalMiembros: 2, miembrosDestacados: [], silenciadoHasta: null, archivada: false }) as Conversacion

  it("una conversación desconocida (me agregaron) pide la lista otra vez", () => {
    const qc = new QueryClient()
    qc.setQueryData(chatKeys.conversaciones, [conv(1)])
    const antes = qc.getQueryState(chatKeys.conversaciones)?.isInvalidated
    aplicarEventoUsuario(qc, { event: "conversacion.actualizada", data: conv(2) })
    expect(antes).toBe(false)
    expect(qc.getQueryState(chatKeys.conversaciones)?.isInvalidated).toBe(true)
  })

  it("una conocida se reemplaza sin pedir la lista", () => {
    const qc = new QueryClient()
    qc.setQueryData(chatKeys.conversaciones, [conv(1)])
    aplicarEventoUsuario(qc, { event: "conversacion.actualizada", data: { ...conv(1), noLeidos: 3 } })
    expect(qc.getQueryData<Conversacion[]>(chatKeys.conversaciones)?.[0].noLeidos).toBe(3)
    expect(qc.getQueryState(chatKeys.conversaciones)?.isInvalidated).toBe(false)
  })

  it("conversacion.eliminada la quita y devuelve el nombre para el aviso", () => {
    const qc = new QueryClient()
    qc.setQueryData(chatKeys.conversaciones, [conv(1, "Feria"), conv(2)])
    const r = aplicarEventoUsuario(qc, { event: "conversacion.eliminada", data: { id: 1, motivo: "QUITADO" } })
    expect(r).toEqual({ id: 1, nombre: "Feria", motivo: "QUITADO" })
    expect(qc.getQueryData<Conversacion[]>(chatKeys.conversaciones)?.map((c) => c.id)).toEqual([2])
  })
})

describe("puedeAgregarParticipantes", () => {
  it("administrador siempre; miembro de grupo solo con agregar=TODOS", () => {
    const admin: Pick<PoliticaChat, "grupos"> = { grupos: { crear: [], agregar: "ADMIN", sucesionAlMasAntiguo: true } }
    const todos: Pick<PoliticaChat, "grupos"> = { grupos: { crear: [], agregar: "TODOS", sucesionAlMasAntiguo: true } }
    expect(puedeAgregarParticipantes(admin, { tipo: "GRUPO", esAdmin: true })).toBe(true)
    expect(puedeAgregarParticipantes(admin, { tipo: "GRUPO", esAdmin: false })).toBe(false)
    expect(puedeAgregarParticipantes(todos, { tipo: "GRUPO", esAdmin: false })).toBe(true)
    expect(puedeAgregarParticipantes(todos, { tipo: "CANAL", esAdmin: false })).toBe(false)
    expect(puedeAgregarParticipantes({}, { tipo: "GRUPO" })).toBe(false)
  })
})

describe("invitaciones a grupos en vivo", () => {
  it("invitaciones.actualizadas vuelve a pedir la lista de invitaciones", async () => {
    const qc = new QueryClient()
    qc.setQueryData(chatKeys.invitaciones, [])
    expect(aplicarEventoUsuario(qc, { event: "invitaciones.actualizadas", data: {} })).toBeNull()
    expect(qc.getQueryState(chatKeys.invitaciones)?.isInvalidated).toBe(true)
  })
})
