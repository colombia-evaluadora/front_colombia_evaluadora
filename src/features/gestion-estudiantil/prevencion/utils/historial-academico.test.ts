import { describe, expect, it } from "vitest"

import { etiquetaMatricula, filasObservaciones, formatNota } from "@/features/gestion-estudiantil/prevencion/utils/historial-academico"

describe("historial académico", () => {
  it("formatea la nota con coma", () => {
    expect(formatNota(3.5)).toBe("3,5")
    expect(formatNota(null)).toBe("")
  })

  it("arma la etiqueta de la matrícula sin partes vacías", () => {
    expect(
      etiquetaMatricula({
        fk_tmatricula: 1, anio: 2025, sede: "Sede A", fk_tsede: 1, jornada: "Mañana", modalidad: "Anual", ciclo: null,
        grado_grupo: "Quinto 5°B", estado: null, resultado: "Promovido", periodos: [], asignaturas: [],
      }),
    ).toBe("2025 · Sede A · Mañana · Anual · Quinto 5°B · Promovido")
  })

  it("muestra las observaciones como «General» y agrega el resultado final", () => {
    const filas = filasObservaciones(
      [{ fk_tperiodo_evaluacion: 7, periodo: "Período 1", observacion: null, sin_registro: true }],
      { observacion: "Bien", sin_registro: false },
    )
    expect(filas.map((f) => [f.asignatura, f.periodo, f.sinRegistro])).toEqual([
      ["General", "Período 1", true],
      ["General", "Resultado final del Período Académico", false],
    ])
  })
})
