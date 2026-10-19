import { downloadReport } from "@/lib/report-client"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/evaluation-period"

interface ExportSelectedEvaluationPeriodsInput {
  ids: number[]
  format: ExportFormat
  /**
   * OBLIGATORIO en la práctica, aunque el tipo lo deje opcional.
   *
   * `fn_periodo_eval_listar` filtra con
   * `WHERE pe.FK_TPERIODO_ACADEMICO = p_fk_periodo`, y `columna = NULL` nunca
   * es verdadero: sin este dato la función devuelve CERO filas y el `ids` de
   * abajo no tiene nada que recortar. El PDF sale con el encabezado y el
   * texto "No hay registros que coincidan con los filtros aplicados", que
   * parece un problema de datos pero es este bind faltante.
   *
   * A diferencia de `/periodos-academicos/reporte` —donde `fn_periodo_listar`
   * tiene TODOS sus filtros opcionales y por eso `ids` solo sí alcanza—, acá
   * el periodo padre es obligatorio.
   */
  academicPeriodId?: number
}

export function exportSelectedEvaluationPeriods(
  input: ExportSelectedEvaluationPeriodsInput,
): Promise<ExportResult> {
  return downloadReport("periodos-evaluacion", {
    format: input.format,
    filters: { FK_PERIODO: input.academicPeriodId ?? null, ids: input.ids },
  })
}
