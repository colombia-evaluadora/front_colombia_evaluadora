import { api } from "@/lib/api-client"
import type { ExportFormat, ExportResult } from "@/features/coverage/matricula/api/types/matricula"

interface ExportSelectedMatriculaInput {
  ids: string[]
  format: ExportFormat
}

export function exportSelectedMatricula(input: ExportSelectedMatriculaInput): Promise<ExportResult> {
  return api.post("/coverage/matricula/export", input)
}
