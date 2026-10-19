import { downloadReport } from "@/lib/report-client"
import { toEstablishmentsQueryFilters } from "@/features/establishment/institution/api/query/use-establishments"
import type { EstablishmentsQueryRequest } from "@/features/establishment/institution/api/types/establishment"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportEstablishmentsInput {
  filters: EstablishmentsQueryRequest["filters"]
  format: ExportFormat
}

export function exportEstablishments(input: ExportEstablishmentsInput): Promise<ExportResult> {
  // Mismos filtros normalizados que el listado (si no, el bind BIGINT[] da 400).
  return downloadReport("establecimientos", {
    format: input.format,
    filters: toEstablishmentsQueryFilters(input.filters),
  })
}
