import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
  TeachersQueryFilters,
} from "../types/academic-period/teacher"

interface ExportAcademicAssignmentsInput {
  filters: TeachersQueryFilters
  format: ExportFormat
}

function exportAcademicAssignments(
  input: ExportAcademicAssignmentsInput
): Promise<ExportResult> {
  return api.post("/teachers/export-all", input)
}

interface UseExportAcademicAssignmentsOptions {
  mutationConfig?: MutationConfig<typeof exportAcademicAssignments>
}

export function useExportAcademicAssignments({
  mutationConfig,
}: UseExportAcademicAssignmentsOptions = {}) {
  return useMutation({
    mutationFn: exportAcademicAssignments,
    ...mutationConfig,
  })
}
