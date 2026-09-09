import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { AsistenciaQueryFilters } from "@/features/academic-management/asistencia/api/types/asistencia"
import type { ExportFormat, ExportResult } from "@/features/academic-management/asistencia/api/types/export"

interface ExportAsistenciaInput {
  filters: AsistenciaQueryFilters
  format: ExportFormat
}

function exportAsistencia(input: ExportAsistenciaInput): Promise<ExportResult> {
  return downloadReport("asistencia", {
    format: input.format,
    filters: input.filters,
  })
}

interface UseExportAsistenciaOptions {
  mutationConfig?: MutationConfig<typeof exportAsistencia>
}

export function useExportAsistencia({ mutationConfig }: UseExportAsistenciaOptions = {}) {
  return useMutation({
    mutationFn: exportAsistencia,
    ...mutationConfig,
  })
}
