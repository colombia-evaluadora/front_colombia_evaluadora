import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportSelectedAcademicAssignmentsInput {
  /** Ids de FUNCIONARIO (docente): es una fila por docente en la tabla. */
  ids: number[]
  format: ExportFormat
  /**
   * Obligatorio en la práctica: `fn_asignacion_reporte_listar` filtra con
   * `WHERE da.FK_TPERIODO_ACADEMICO = p_fk_periodo`, y `columna = NULL` nunca
   * es verdadero — sin esto el reporte sale vacío.
   */
  academicPeriodId?: number
}

/**
 * Exporta las ASIGNACIONES de los docentes seleccionados, no su ficha.
 *
 * Antes esta pantalla reusaba `useExportSelected` del módulo de empleados, que
 * pega al reporte `funcionarios`: eso devuelve una fila por docente
 * (documento, nombre, estado, jornada, roles, sedes) y no las asignaciones que
 * la tabla muestra al desplegar cada fila. El resultado era un archivo que no
 * tenía nada que ver con lo que el usuario veía en pantalla.
 *
 * El reporte correcto es `asignaciones` (`fn_asignacion_reporte_listar`), que
 * devuelve una fila por docente-grado-grupo-asignatura-jornada — exactamente
 * los "subdatos" de cada fila desplegable. Su filtro `ids` compara contra
 * `docente_id` (ver V135), así que tildar un docente trae TODAS sus
 * asignaciones del periodo.
 *
 * Es además el mismo reporte que ya usa el botón de "exportar todo" de esta
 * pantalla (`export-academic-assignment-report.ts`), así que ahora ambos
 * botones exportan el mismo tipo de documento.
 */
function exportSelectedAcademicAssignments(
  input: ExportSelectedAcademicAssignmentsInput,
): Promise<ExportResult> {
  return downloadReport("asignaciones", {
    format: input.format,
    filters: { FK_PERIODO: input.academicPeriodId ?? null, ids: input.ids },
  })
}

interface UseExportSelectedAcademicAssignmentsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedAcademicAssignments>
}

export function useExportSelectedAcademicAssignments({
  mutationConfig,
}: UseExportSelectedAcademicAssignmentsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedAcademicAssignments,
    ...mutationConfig,
  })
}