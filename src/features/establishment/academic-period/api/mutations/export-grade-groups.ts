import { api } from "@/lib/api-client"
import type {
  ExportFormat,
  ExportResult,
  GradeGroupsQueryFilters,
} from "@/features/establishment/academic-period/api/types/grade-group"

interface ExportGradeGroupsInput {
  filters: GradeGroupsQueryFilters
  format: ExportFormat
}

// Sin endpoint real en el contrato todavía — mismo caso que el resto de
// exports del módulo (ver comentario en `export-selected-grade-groups.ts`).
export function exportGradeGroups(input: ExportGradeGroupsInput): Promise<ExportResult> {
  return api.post("/grade-groups/export-all", input)
}
