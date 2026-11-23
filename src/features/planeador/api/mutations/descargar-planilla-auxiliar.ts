import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX } from "@/lib/api-routes"
import { downloadReport } from "@/lib/report-client"
import type { ExportResult } from "@/features/establishment/institution/api/types/export"

/** Tipos que el back ya genera; Calificaciones y Rúbricas siguen pendientes (Regla 96). */
export type TipoPlanillaAuxiliar = "LISTADO" | "ASISTENCIA"

export interface PlanillaAuxiliarInput {
  tipo: TipoPlanillaAuxiliar
  grupo: number
  /** null = Todas (una hoja por [Área]). No aplica a Listado. */
  asignatura: number | null
  periodo: number | null
  contenido: "EN_BLANCO" | "CON_REGISTRADO"
  columnas: number
  /** Resumen legible para la Bitácora (grupo, área, período). */
  etiquetas: Record<string, string>
}

/** Filtros de `POST /reportes/planilla-auxiliar` (sso V753, `BODY.FILTERS.*`). */
export function filtrosPlanillaAuxiliar(input: PlanillaAuxiliarInput) {
  return input.tipo === "LISTADO"
    ? { TIPO: "LISTADO", GRUPO: input.grupo, COLUMNAS: input.columnas }
    : {
        TIPO: "ASISTENCIA",
        GRUPO: input.grupo,
        ASIGNATURA: input.asignatura ?? undefined,
        PERIODO: input.periodo,
        CONTENIDO: input.contenido,
      }
}

/**
 * Descarga el PDF de la planilla y deja la generación en la Bitácora con el
 * mismo mecanismo que Imprimir de Asistencia por grupo (B3): un fallo del
 * registro no tumba una descarga que ya se hizo.
 */
export async function descargarPlanillaAuxiliar(input: PlanillaAuxiliarInput): Promise<ExportResult> {
  const filters = filtrosPlanillaAuxiliar(input)
  const resultado = await downloadReport("planilla-auxiliar", {
    format: "pdf",
    filters,
    params: { tipo: input.tipo.toLowerCase() },
  })
  if (resultado.status === "ok") {
    await api
      .post(`${AUDIT_API_PREFIX}/bitacora/exportaciones`, {
        MODULO: "PLANEADOR",
        FORMATO: "PDF",
        FILTROS: JSON.stringify({ reporte: "planilla-auxiliar", accion: "GENERAR", ...filters, ...input.etiquetas }),
        FILAS: String(resultado.filas ?? 0),
      })
      .catch(() => undefined)
  }
  return resultado
}

export function useDescargarPlanillaAuxiliar() {
  return useMutation({ mutationFn: descargarPlanillaAuxiliar })
}
