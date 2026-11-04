import { describe, expect, it } from "vitest"

import {
  toAsistenciaPorGrupo,
  totalesEstudiante,
} from "@/features/academic-management/asistencia/api/query/use-asistencia-por-grupo-query"

const fila = (over: Record<string, unknown>) => ({
  fk_tasignatura: 7,
  asignatura: "Aritmética",
  fecha: "2026-10-26",
  bloque: 0,
  sesion_registrada: true,
  fk_tmatricula: 1,
  estudiante: "Ana Pérez",
  documento: "100",
  tipo_valor: 1,
  justificada: false,
  en_grupo: true,
  ...over,
})

describe("toAsistenciaPorGrupo", () => {
  it("pivota sesiones y estudiantes en orden de fecha", () => {
    const { sesiones, estudiantes } = toAsistenciaPorGrupo([
      fila({ fecha: "2026-10-27" }),
      fila({ fecha: "2026-10-26" }),
      fila({ fk_tmatricula: 2, estudiante: "Luis", fecha: "2026-10-26", tipo_valor: 2 }),
    ] as never)
    expect(sesiones.map((s) => s.fecha)).toEqual(["2026-10-26", "2026-10-27"])
    expect(estudiantes).toHaveLength(2)
    expect(estudiantes[1].celdas.get(sesiones[0].id)?.marca).toBe("FALLA")
  })
})

describe("totalesEstudiante", () => {
  it("cuenta fallas, justificadas, retrasos y % sobre las registradas", () => {
    const { sesiones, estudiantes } = toAsistenciaPorGrupo([
      fila({ fecha: "2026-10-20", tipo_valor: 1 }),
      fila({ fecha: "2026-10-21", tipo_valor: 2, justificada: true }),
      fila({ fecha: "2026-10-22", tipo_valor: 5 }),
      fila({ fecha: "2026-10-23", tipo_valor: 2 }),
      // Sin marca (sesión pendiente) y fuera del grupo: no cuentan.
      fila({ fecha: "2026-10-26", tipo_valor: null, sesion_registrada: false }),
      fila({ fecha: "2026-10-27", tipo_valor: null, en_grupo: false }),
    ] as never)
    expect(totalesEstudiante(estudiantes[0], sesiones)).toEqual({
      fallas: 2,
      justificadas: 1,
      retrasos: 1,
      porcentaje: 50,
    })
  })

  it("sin sesiones registradas no hay porcentaje", () => {
    const { sesiones, estudiantes } = toAsistenciaPorGrupo([fila({ tipo_valor: null })] as never)
    expect(totalesEstudiante(estudiantes[0], sesiones).porcentaje).toBeNull()
  })
})
