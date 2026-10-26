import { describe, expect, it } from "vitest"
import { QueryClient } from "@tanstack/react-query"

import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Miembro, RespuestaAutomatica } from "@/features/comunicaciones/chat/api/types"
import { aplicarEventoUsuario, aplicarPresencia } from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"
import { conPunto, estaInactivo, estadoDe } from "@/features/comunicaciones/chat/lib/disponibilidad"

describe("estadoDe", () => {
  it("usa el estado del servidor si viene", () => {
    expect(estadoDe({ estado: "OCUPADO", enLinea: true })).toBe("OCUPADO")
    expect(estadoDe({ disponibilidad: "AUSENTE", enLinea: true })).toBe("AUSENTE")
  })

  it("sin estado cae a enLinea (mock y servidores anteriores)", () => {
    expect(estadoDe({ enLinea: true })).toBe("EN_LINEA")
    expect(estadoDe({ enLinea: false })).toBe("DESCONECTADO")
    // `estado` de un miembro es su membresía, no la disponibilidad.
    expect(estadoDe({ estado: "ACTIVO", enLinea: false })).toBe("DESCONECTADO")
    expect(estadoDe(null)).toBeUndefined()
  })

  it("desconectado no lleva punto", () => {
    expect(conPunto("DESCONECTADO")).toBe(false)
    expect(conPunto(undefined)).toBe(false)
    expect(conPunto("INVISIBLE")).toBe(true)
  })
})

describe("estaInactivo", () => {
  it("cuenta desde la última actividad", () => {
    expect(estaInactivo(0, 9 * 60_000, 10 * 60_000)).toBe(false)
    expect(estaInactivo(0, 10 * 60_000, 10 * 60_000)).toBe(true)
  })
})

describe("tiempo real de disponibilidad", () => {
  it("presencia.actualizada llena el mapa y parchea miembros", () => {
    const qc = new QueryClient()
    const miembros: Miembro[] = [{ id: 5, nombre: "Ana", rol: "Miembro", enLinea: false, bloqueado: false }]
    qc.setQueryData(chatKeys.miembros(1), miembros)
    aplicarPresencia(qc, { usuarioId: 5, enLinea: true, estado: "AUSENTE" })
    expect(qc.getQueryData(chatKeys.presencia)).toEqual({ 5: "AUSENTE" })
    expect(qc.getQueryData<Miembro[]>(chatKeys.miembros(1))?.[0]).toMatchObject({
      enLinea: true,
      disponibilidad: "AUSENTE",
    })
    aplicarPresencia(qc, { usuarioId: 5, enLinea: false, estado: "DESCONECTADO" })
    expect(qc.getQueryData(chatKeys.presencia)).toEqual({ 5: "DESCONECTADO" })
  })

  it("respuesta.automatica se guarda una por conversación y persona", () => {
    const qc = new QueryClient()
    const r: RespuestaAutomatica = { conversacionId: 3, usuarioId: 5, nombre: "Ana", texto: "En clase", fecha: "x" }
    aplicarEventoUsuario(qc, { event: "respuesta.automatica", data: r })
    aplicarEventoUsuario(qc, { event: "respuesta.automatica", data: { ...r, texto: "Vuelvo 2 p. m." } })
    expect(qc.getQueryData<RespuestaAutomatica[]>(chatKeys.respuestasAutomaticas)).toEqual([
      { ...r, texto: "Vuelvo 2 p. m." },
    ])
  })

  it("disponibilidad.actualizada reemplaza el estado propio", () => {
    const qc = new QueryClient()
    const d = { estado: "OCUPADO", origen: "MANUAL", cambiadoEn: null, respuestaAutomatica: null, visiblePara: [], inactividadMinutos: 10 }
    aplicarEventoUsuario(qc, { event: "disponibilidad.actualizada", data: d })
    expect(qc.getQueryData(chatKeys.disponibilidad)).toEqual(d)
  })
})
