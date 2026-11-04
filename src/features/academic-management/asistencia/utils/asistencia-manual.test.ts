import { describe, expect, it } from "vitest"

import { registrosPorBloque } from "@/features/academic-management/asistencia/utils/asistencia-manual"

const JUSTIFICACION = { justificacion: "Cita médica", fuente: 7, fuenteNombre: "Llamada del acudiente" }

describe("registrosPorBloque con justificación sin archivo", () => {
  it("la manda con el registro No asistió", () => {
    const porBloque = registrosPorBloque([null], { 10: 2 }, {}, {}, {}, new Map(), { 10: JUSTIFICACION })
    expect(porBloque.get(null)).toEqual([
      { fkMatricula: 10, tipoAsistencia: 2, justificacion: "Cita médica", fkFuenteJustificacion: 7 },
    ])
  })

  it("no la manda si el estudiante quedó como Asistió", () => {
    const porBloque = registrosPorBloque([null], { 10: 1 }, {}, {}, {}, new Map(), { 10: JUSTIFICACION })
    expect(porBloque.get(null)).toEqual([{ fkMatricula: 10, tipoAsistencia: 1 }])
  })

  it("en bloques seguidos la lleva la corrida No asistió / Llegó tarde, no los Asistió", () => {
    const porBloque = registrosPorBloque([0, 1, 2], { 10: 5 }, { 10: 1 }, {}, {}, new Map(), { 10: JUSTIFICACION })
    expect(porBloque.get(0)?.[0]).toMatchObject({ tipoAsistencia: 2, justificacion: "Cita médica" })
    expect(porBloque.get(1)?.[0]).toMatchObject({ tipoAsistencia: 5, justificacion: "Cita médica" })
    expect(porBloque.get(2)?.[0]).toEqual({ fkMatricula: 10, tipoAsistencia: 1 })
  })

  it("quitarla antes de guardar viaja como null", () => {
    const quitada = { justificacion: null, fuente: null, fuenteNombre: null }
    const porBloque = registrosPorBloque([null], { 10: 2 }, {}, {}, {}, new Map(), { 10: quitada })
    expect(porBloque.get(null)?.[0]).toMatchObject({ justificacion: null, fkFuenteJustificacion: null })
  })
})

describe("registrosPorBloque: soporte y justificación son excluyentes", () => {
  it("con justificación no manda el soporte guardado", () => {
    const roster = new Map([[null, [{ fk_tmatricula: 10, fk_soporte_archivo: 55 } as never]]])
    const porBloque = registrosPorBloque([null], { 10: 2 }, {}, {}, {}, roster, { 10: JUSTIFICACION })
    expect(porBloque.get(null)?.[0]).not.toHaveProperty("fkArchivo")
    expect(porBloque.get(null)?.[0]).toMatchObject({ justificacion: "Cita médica" })
  })

  it("sin justificación sigue mandando el soporte", () => {
    const roster = new Map([[null, [{ fk_tmatricula: 10, fk_soporte_archivo: 55 } as never]]])
    const porBloque = registrosPorBloque([null], { 10: 2 }, {}, {}, {}, roster)
    expect(porBloque.get(null)?.[0]).toMatchObject({ fkArchivo: 55 })
  })
})
