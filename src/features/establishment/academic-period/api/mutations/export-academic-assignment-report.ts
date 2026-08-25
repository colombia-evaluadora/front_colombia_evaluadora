import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { AcademicAssignmentReportFilters } from "@/features/establishment/academic-period/api/types/academic-assignment"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportAcademicAssignmentReportInput {
  filters: AcademicAssignmentReportFilters
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
      FK_FUNCIONARIO: input.filters.teacherIds?.length ? input.filters.teacherIds : null,
      FK_GRADO: input.filters.gradeIds?.length ? input.filters.gradeIds : null,
      FK_ASIGNATURA: input.filters.subjectIds?.length ? input.filters.subjectIds : null,
      FK_JORNADA: input.filters.jornadaIds?.length ? input.filters.jornadaIds : null,
      ESTADO: input.filters.estado ?? null,
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
