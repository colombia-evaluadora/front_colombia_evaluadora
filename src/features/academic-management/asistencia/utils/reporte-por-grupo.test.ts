import { describe, expect, it } from "vitest"

import { armarReportePorGrupo, registroBitacora } from "./reporte-por-grupo"

const base = {
  grupo: 7,
  periodo: 3,
  busqueda: "",
  ocultos: new Set<never>(),
  grupoNombre: "6°A",
  areaNombre: "Todas las áreas",
  periodoNombre: "Periodo 1",
}

describe("armarReportePorGrupo", () => {
  it("sin área ni búsqueda manda solo grupo, período y todos los totales", () => {
    const r = armarReportePorGrupo(base)
    expect(r.filters).toEqual({
      GRUPO: 7,
      PERIODO: 3,
      TOTALES: ["fallas", "justificadas", "retrasos", "porcentaje"],
    })
    expect(r.filtersLabel).toBe("Grado/Grupo: 6°A · Área: Todas las áreas · Período de evaluación: Periodo 1")
  })

  it("con área, búsqueda y totales ocultos", () => {
    const r = armarReportePorGrupo({
      ...base,
      asignatura: 12,
      busqueda: "  ana ",
      ocultos: new Set(["justificadas", "porcentaje"] as const),
      areaNombre: "Matemáticas",
    })
    expect(r.filters).toEqual({ GRUPO: 7, PERIODO: 3, ASIGNATURA: 12, BUSQUEDA: "ana", TOTALES: ["fallas", "retrasos"] })
    expect(r.filtersLabel).toContain("Área: Matemáticas")
    expect(r.filtersLabel).toContain("Búsqueda: «ana»")
  })
})

describe("registroBitacora", () => {
  it("deja módulo, formato, acción y filas", () => {
    const r = armarReportePorGrupo(base)
    const cuerpo = registroBitacora(r, "IMPRIMIR", "pdf", 35)
    expect(cuerpo.MODULO).toBe("GESTION_ACADEMICA")
    expect(cuerpo.FORMATO).toBe("PDF")
    expect(cuerpo.FILAS).toBe("35")
    expect(JSON.parse(cuerpo.FILTROS)).toMatchObject({ reporte: "asistencia-por-grupo", accion: "IMPRIMIR", GRUPO: 7 })
    expect(registroBitacora(r, "EXPORTAR", "excel", undefined).FORMATO).toBe("EXCEL")
  })
})
