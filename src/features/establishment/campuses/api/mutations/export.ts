import { downloadReport } from "@/lib/report-client"
import { toCampusesQueryFilters } from "@/features/establishment/campuses/api/query/use-campuses"
import type { CampusesQueryRequest } from "@/features/establishment/campuses/api/types/campus"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportCampusesInput {
  filters: CampusesQueryRequest["filters"]
  format: ExportFormat
}

export function exportCampuses(input: ExportCampusesInput): Promise<ExportResult> {
  // Mismos filtros normalizados que el listado (si no, el bind BIGINT[] da 400).
  return downloadReport("sedes", {
    format: input.format,
    filters: toCampusesQueryFilters(input.filters),
  })
}
