import { describe, expect, it } from "vitest"

import {
  datosDePublicService,
  toInscripcionConsulta,
} from "@/features/publico/consultar/api/consulta-publica"

describe("consulta pública de inscripción", () => {
  it("lee `[{datos}]` y `{rows:[{datos}]}`", () => {
    expect(datosDePublicService([{ datos: { enviado: true } }])).toEqual({ enviado: true })
    expect(datosDePublicService({ rows: [{ datos: 1 }] })).toBe(1)
    expect(datosDePublicService([])).toBeNull()
    expect(datosDePublicService(null)).toBeNull()
  })

  it("mapea la respuesta encontrada del backend", () => {
    const i = toInscripcionConsulta(
      {
        encontrada: true,
        numeroInscripcion: "00412",
        estado: "INSCRITA",
        aspirante: "Ana Ruiz",
        grupoAdmision: "2028 · Anual · Ciclo 1",
        opciones: [
          { preferencia: 1, grado: "Sexto", establecimiento: "IE Central", sede: "Principal", jornada: "Mañana", numeroSorteo: 7, estado: "PENDIENTE" },
        ],
        autorizaciones: [{ establecimientoId: 1, establecimiento: "IE Central", autorizado: false }],
      },
      "123",
    )
    expect(i).toMatchObject({ numero: "00412", documento: "123", grado: "Sexto", grupoAdmision: "2028 · Anual · Ciclo 1", estado: "INSCRITA" })
    expect(i.opciones[0]).toMatchObject({ numero: 1, sorteo: "0007", posicion: null })
    expect(i.autorizaciones).toEqual([{ establecimientoId: 1, establecimiento: "IE Central", autorizado: false }])
  })

  it("tolera opciones nulas y estados desconocidos", () => {
    const i = toInscripcionConsulta({ encontrada: true, estado: "OTRO", opciones: null }, "1")
    expect(i.estado).toBe("INSCRITA")
    expect(i.opciones).toEqual([])
    expect(i.autorizaciones).toEqual([])
  })
})
