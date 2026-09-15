import { api } from "@/lib/api-client"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"

import { subjectLabelOptionsUrl } from "@/features/academic-management/curricular-references/api/query/use-subject-label-options"

interface CreateSubjectLabelResultRow {
  pk_lista_valor_creado: number
}

export async function createSubjectLabelOption(valor: string): Promise<number> {
  const raw = await api.post<RowsEnvelope<CreateSubjectLabelResultRow> | CreateSubjectLabelResultRow>(
    subjectLabelOptionsUrl(),
    { VALOR: valor },
  )
  return unwrapRow(raw).pk_lista_valor_creado
}
