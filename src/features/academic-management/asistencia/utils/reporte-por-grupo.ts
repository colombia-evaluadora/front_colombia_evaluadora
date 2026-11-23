import type { ExportFormat } from "@/features/establishment/institution/api/types/export"

/** Totales de la pestaña que se pueden ocultar (columnas visibles). */
export type TotalPorGrupo = "fallas" | "justificadas" | "retrasos" | "porcentaje"

/** Filtros de `POST /reportes/asistencia-por-grupo` (sso V748.2, bajo BODY.FILTERS). */
export interface FiltrosReportePorGrupo {
  GRUPO: number
  PERIODO: number
  ASIGNATURA?: number
  BUSQUEDA?: string
  TOTALES: TotalPorGrupo[]
}

/** Lo que el encabezado de la página necesita para Imprimir y Exportar. */
export interface ReportePorGrupo {
  filters: FiltrosReportePorGrupo
  /** Grado/Grupo · Área · Período con nombres, para el membrete. */
  filtersLabel: string
}

const ORDEN_TOTALES: TotalPorGrupo[] = ["fallas", "justificadas", "retrasos", "porcentaje"]

export function armarReportePorGrupo(input: {
  grupo: number
  periodo: number
  /** `undefined` = todas las áreas. */
  asignatura?: number
  busqueda: string
  ocultos: ReadonlySet<TotalPorGrupo>
  grupoNombre: string
  areaNombre: string
  periodoNombre: string
}): ReportePorGrupo {
  const busqueda = input.busqueda.trim()
  return {
    filters: {
      GRUPO: input.grupo,
      PERIODO: input.periodo,
      ...(input.asignatura != null ? { ASIGNATURA: input.asignatura } : {}),
      ...(busqueda ? { BUSQUEDA: busqueda } : {}),
      TOTALES: ORDEN_TOTALES.filter((t) => !input.ocultos.has(t)),
    },
    filtersLabel: [
      `Grado/Grupo: ${input.grupoNombre}`,
      `Área: ${input.areaNombre}`,
      `Período de evaluación: ${input.periodoNombre}`,
      ...(busqueda ? [`Búsqueda: «${busqueda}»`] : []),
    ].join(" · "),
  }
}

/** Cuerpo de `POST /audit-cval/bitacora/exportaciones` (Regla 17): módulo, formato, filtros y filas. */
export function registroBitacora(
  reporte: ReportePorGrupo,
  accion: "IMPRIMIR" | "EXPORTAR",
  format: ExportFormat,
  filas: number | undefined,
) {
  return {
    MODULO: "GESTION_ACADEMICA",
    FORMATO: format === "pdf" ? "PDF" : "EXCEL",
    FILTROS: JSON.stringify({ reporte: "asistencia-por-grupo", accion, ...reporte.filters }),
    FILAS: String(filas ?? 0),
  }
}
