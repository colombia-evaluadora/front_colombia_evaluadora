import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportAcademicAssignmentReportInput {
  filters: { academicPeriodId?: number }
  format: ExportFormat
}

// Reporte dedicado de asignación académica (`fn_asignacion_reporte_listar`,
// V140) — una fila por asignación docente+grado+grupo+asignatura+jornada.
// NO confundir con el export de "funcionarios" (módulo empleados): ese trae
// la lista de docentes sin sus asignaturas/grado/grupo asignados.
function exportAcademicAssignmentReport(
  input: ExportAcademicAssignmentReportInput
): Promise<ExportResult> {
  return downloadReport("asignaciones", {
    format: input.format,
    filters: {
      FK_PERIODO: input.filters.academicPeriodId ?? null,
      FK_FUNCIONARIO: null,
      FK_GRADO: null,
      FK_ASIGNATURA: null,
      FK_JORNADA: null,
      ESTADO: null,
    },
  })
}

interface UseExportAcademicAssignmentReportOptions {
  mutationConfig?: MutationConfig<typeof exportAcademicAssignmentReport>
}

export function useExportAcademicAssignmentReport({
  mutationConfig,
}: UseExportAcademicAssignmentReportOptions = {}) {
  return useMutation({
    mutationFn: exportAcademicAssignmentReport,
    ...mutationConfig,
  })
}
