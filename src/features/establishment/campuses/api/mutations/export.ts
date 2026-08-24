import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CampusesQueryRequest } from "@/features/establishment/campuses/api/types/campus"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportCampusesInput {
  filters: CampusesQueryRequest["filters"]
  format: ExportFormat
}

function exportCampuses(input: ExportCampusesInput): Promise<ExportResult> {
  // El reporte lo genera reporting-service con la MISMA funcion PL/pgSQL
  // que alimenta esta tabla, sin paginar: los filtros que no se mandan
  // llegan NULL y la funcion los ignora, o sea que sin filtros sale todo.
  // `downloadReport` dispara la descarga y devuelve el {status, message}
  // que este dialogo ya sabia consumir.
  return downloadReport("sedes", input)
}

interface UseExportOptions {
  mutationConfig?: MutationConfig<typeof exportCampuses>
}

export function useExport({ mutationConfig }: UseExportOptions = {}) {
  return useMutation({
    mutationFn: exportCampuses,
    ...mutationConfig,
  })
}
