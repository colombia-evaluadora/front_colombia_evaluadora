import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

interface SubjectLabelResolutionRow {
  nombre_asignatura: string | null
}

async function fetchResolvedSubjectLabel(referenceId: number): Promise<string | null> {
  const url = apiPath(
    `/academic-management/curricular-references/${referenceId}/nombre-asignatura`,
    `/referentes-curriculares/${referenceId}/nombre-asignatura`,
  )
  const raw = await api.get<RowsEnvelope<SubjectLabelResolutionRow> | SubjectLabelResolutionRow[]>(url)
  const rows = unwrapRows(raw)
  return rows[0]?.nombre_asignatura ?? null
}

export const resolvedSubjectLabelQueryKey = (referenceId: number | null) =>
  ["curricular-reference-subject-label-resolution", referenceId] as const

export function useResolvedSubjectLabelQuery(referenceId: number | null | undefined) {
  return useQuery({
    queryKey: resolvedSubjectLabelQueryKey(referenceId ?? null),
    queryFn: () => fetchResolvedSubjectLabel(referenceId as number),
    enabled: referenceId != null,
    staleTime: 1000 * 60,
  })
}
