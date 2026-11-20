import { describe, expect, it } from "vitest"

import {
  conUbicacion,
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

describe("ubicación propuesta en Consultar inscripción", () => {
  const base = () =>
    toInscripcionConsulta(
      {
        encontrada: true,
        numeroInscripcion: "00178",
        estado: "NO_ADMITIDA",
        opciones: [
          { id: 1, preferencia: 1, establecimiento: "IE Central", sede: "Sede 1", jornada: "Tarde", estado: "NO_ADMITIDA" },
          { id: 9, preferencia: 4, redistribucion: true, establecimiento: "IE Central", sede: "Sede 2", jornada: "Tarde", estado: "ADMITIDA" },
        ],
        motivosAnulacion: [{ id: 3, nombre: "La familia desiste" }],
      },
      "1",
    )
  const ubicacion = {
    id: 5,
    opcionId: 9,
    establecimiento: "IE Central",
    sede: "Sede 2",
    jornada: "Tarde",
    grado: "Sexto",
    requiereConfirmacion: true,
    confirmada: false,
    confirmarHasta: null,
  }

  it("No admitida se muestra como Sin cupo y la redistribución va sin número de preferencia", () => {
    const i = base()
    expect(i.estado).toBe("SIN_CUPO")
    expect(i.opciones[1]).toMatchObject({ id: 9, numero: null })
    expect(i.motivosAnulacion).toEqual([{ id: 3, nombre: "La familia desiste" }])
  })

  it("pendiente de confirmar → Ubicación propuesta; confirmada → Ubicado", () => {
    expect(conUbicacion(base(), ubicacion).estado).toBe("UBICACION_PROPUESTA")
    const ubicado = conUbicacion(base(), { ...ubicacion, confirmada: true })
    expect(ubicado.estado).toBe("UBICADO")
    expect(ubicado.opciones[1].reservada).toBe(true)
    expect(conUbicacion(base(), null).estado).toBe("SIN_CUPO")
  })
})
