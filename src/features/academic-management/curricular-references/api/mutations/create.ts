import { api } from "@/lib/api-client"

import type {
  CurricularReference,
  CurricularReferenceDraft,
} from "@/features/academic-management/curricular-references/api/types/curricular-reference"

export interface CurricularReferenceMutationResult {
  status: "ok" | "error"
  message: string
  curricularReference: CurricularReference
}

export function create(values: CurricularReferenceDraft): Promise<CurricularReferenceMutationResult> {
  return api.post("/academic-management/curricular-references", values)
}

export function update(
  id: number,
  values: CurricularReferenceDraft,
): Promise<CurricularReferenceMutationResult> {
  return api.put(`/academic-management/curricular-references/${id}`, values)
}
