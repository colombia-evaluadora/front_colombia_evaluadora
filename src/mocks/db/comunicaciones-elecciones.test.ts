import { describe, expect, it } from "vitest"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { elecciones, vistaEleccion } from "@/mocks/db/comunicaciones-elecciones"
import { vistaVotacion } from "@/mocks/handlers/comunicaciones"
import { mensajeNeutro } from "@/mocks/realtime/chat"

// El mock replica el contrato de comms-service: sin resultados en vivo.
describe("vistaEleccion", () => {
  const abierta = { ...elecciones[0], fechaCierre: new Date(Date.now() + 60_000).toISOString(), cerradaManualmente: false }

  it("abierta no manda conteos a nadie; la participación solo a quien gestiona", () => {
    const creador = vistaEleccion(abierta, { gestiona: true, yaVoto: false })
    expect(creador.candidatos.every((c) => c.votos === null)).toBe(true)
    expect(creador.votosEnBlanco).toBeNull()
    expect(creador.votaron).toBeGreaterThan(0)
    const votante = vistaEleccion(abierta, { gestiona: false, yaVoto: true })
    expect(votante.candidatos.every((c) => c.votos === null)).toBe(true)
    expect(votante.votaron).toBeNull()
  })

  it("cerrada manda el resultado final a todos", () => {
    const v = vistaEleccion({ ...abierta, cerradaManualmente: true }, { gestiona: false, yaVoto: true })
    expect(v.candidatos.map((c) => c.votos)).toEqual(abierta.candidatos.map((c) => c.votos))
    expect(v.votosEnBlanco).toBe(abierta.votosEnBlanco)
    expect(v.votaron).not.toBeNull()
  })
})

describe("vistaVotacion (votación rápida)", () => {
  const conVotos = (cierraEn: string, esPropio: boolean): Mensaje =>
    ({
      id: 1,
      conversacionId: 1,
      autor: { id: 1, nombre: "Ana", enLinea: true },
      esPropio,
      texto: "",
      fecha: new Date().toISOString(),
      adjunto: null,
      editado: false,
      fijado: false,
      votacion: {
        pregunta: "¿?",
        tipo: "SI_NO",
        minutos: 5,
        cierraEn,
        miVoto: 1,
        opciones: [
          { id: 1, etiqueta: "Sí", votos: 3 },
          { id: 2, etiqueta: "No", votos: 1 },
        ],
      },
    }) as Mensaje
  const futuro = new Date(Date.now() + 60_000).toISOString()
  const pasado = new Date(Date.now() - 60_000).toISOString()

  it("abierta: sin conteos; el total solo para quien la creó", () => {
    expect(vistaVotacion(conVotos(futuro, true)).votacion).toMatchObject({ cerrada: false, totalVotos: 4 })
    const ajena = vistaVotacion(conVotos(futuro, false)).votacion
    expect(ajena?.opciones.map((o) => o.votos)).toEqual([null, null])
    expect(ajena?.totalVotos).toBeNull()
  })

  it("cerrada: conteos y total para todos", () => {
    const v = vistaVotacion(conVotos(pasado, false)).votacion
    expect(v?.opciones.map((o) => o.votos)).toEqual([3, 1])
    expect(v?.totalVotos).toBe(4)
  })

  it("el evento del socket nunca lleva conteos con la votación abierta", () => {
    const v = mensajeNeutro(conVotos(futuro, true)).votacion
    expect(v?.opciones.map((o) => o.votos)).toEqual([null, null])
    expect(v?.totalVotos).toBeNull()
    expect(v?.miVoto).toBeNull()
  })
})
