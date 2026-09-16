import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import type { SubjectLabelOption } from "@/features/academic-management/curricular-references/api/types/subject-label"

interface SubjectLabelOptionRow {
  pk_lista_valor: number
  valor: string
  es_semilla: boolean
  en_uso: number
}

export function subjectLabelOptionsUrl() {
  return apiPath(
    "/academic-management/curricular-references/personalizar-asignatura",
    "/referentes-curriculares/personalizar-asignatura",
  )
}

async function fetchSubjectLabelOptions(): Promise<SubjectLabelOption[]> {
  const raw = await api.get<RowsEnvelope<SubjectLabelOptionRow> | SubjectLabelOptionRow[]>(
    subjectLabelOptionsUrl(),
  )
  return unwrapRows(raw).map((row) => ({
    id: row.pk_lista_valor,
    code: "",
    name: row.valor,
    isSeed: row.es_semilla,
    inUse: row.en_uso > 0,
  }))
}

export const subjectLabelOptionsQueryKey = () => ["curricular-reference-subject-label-options"]

export function useSubjectLabelOptionsQuery() {
  return useQuery({
    queryKey: subjectLabelOptionsQueryKey(),
    queryFn: fetchSubjectLabelOptions,
  })
}
