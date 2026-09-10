import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

import type {
  CurricularEvidence,
  CurricularEvidenceDraft,
  CurricularStatement,
  CurricularStatementDraft,
} from "@/features/academic-management/curricular-references/api/types/statement"


interface StatementResult {
  status?: "ok" | "error"
  message?: string
  statement?: CurricularStatement
  id?: number
}

interface CreateStatementResponse {
  status?: "ok" | "error"
  message?: string
  statement?: CurricularStatement
  pkReferenteEnunciadoCreado?: number
  id?: number
}

function statementsUrl(curricularReferenceId: number) {
  return apiPath(
    `/academic-management/curricular-references/${curricularReferenceId}/statements`,
    `/referentes-curriculares/${curricularReferenceId}/enunciados`,
  )
}

function enunciadoUrl(id: number) {
  return apiPath(`/academic-management/curricular-statements/${id}`, `/referentes-curriculares/enunciados/${id}`)
}

async function createStatement(input: {
  curricularReferenceId: number
  areaId: number | null
  text: string
  active: boolean
}): Promise<StatementResult> {
  const url = statementsUrl(input.curricularReferenceId)
  if (env.ENABLE_API_MOCKING) {
    return api.post<StatementResult>(url, { areaId: input.areaId, text: input.text, active: input.active })
  }
  const raw = await api.post<CreateStatementResponse>(url, {
    TEXTO: input.text,
    AREA_ID: input.areaId,
    ESTADO: input.active ? "A" : "I",
  })
  return {
    status: raw.status,
    message: raw.message,
    statement: raw.statement,
    id: raw.statement?.id ?? raw.pkReferenteEnunciadoCreado ?? raw.id,
  }
}

export function useCreateStatement(options: { mutationConfig?: MutationConfig<typeof createStatement> } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createStatement,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-statements"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

function updateStatement({ id, values }: { id: number; values: Partial<CurricularStatementDraft> }) {
  const url = enunciadoUrl(id)
  if (env.ENABLE_API_MOCKING) {
    return api.put<StatementResult>(url, values)
  }
  return api.patch<StatementResult>(url, {
    ...(values.text != null ? { TEXTO: values.text } : {}),
    ...(values.active != null ? { ESTADO: values.active ? "A" : "I" } : {}),
    ...(values.areaId === undefined ? {} : values.areaId === null ? { LIMPIAR_AREA: true } : { AREA_ID: values.areaId }),
  })
}

export function useUpdateStatement(options: { mutationConfig?: MutationConfig<typeof updateStatement> } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateStatement,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-statements"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

function deleteStatement(id: number) {
  if (env.ENABLE_API_MOCKING) {
    return api.delete<{ status: "ok" | "error"; message: string }>(
      `/academic-management/curricular-statements/${id}`,
    )
  }
  return api.patch<{ status?: "ok" | "error"; message?: string }>(
    `/eval-col/referentes-curriculares/enunciados/${id}/eliminar`,
  )
}

export function useDeleteStatement(options: { mutationConfig?: MutationConfig<typeof deleteStatement> } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteStatement,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-statements"] })
      queryClient.invalidateQueries({ queryKey: ["curricular-evidences"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

interface EvidencesResult {
  status?: "ok" | "error"
  message?: string
  evidences?: CurricularEvidence[]
}

async function createEvidences(input: {
  curricularReferenceId: number
  statementId: number
  texts: string[]
  active: boolean
}) {
  if (env.ENABLE_API_MOCKING) {
    const url = apiPath(`/academic-management/curricular-statements/${input.statementId}/evidences`, "")
    return api.post<EvidencesResult>(url, { texts: input.texts, active: input.active })
  }

  const url = statementsUrl(input.curricularReferenceId)
  const created: CurricularEvidence[] = []
  for (const text of input.texts) {
    const response = await api.post<StatementResult>(url, {
      TEXTO: text,
      ENUNCIADO_PADRE: input.statementId,
      ESTADO: input.active ? "A" : "I",
    })
    if (response.statement) created.push(response.statement as unknown as CurricularEvidence)
  }
  return { status: "ok", evidences: created } satisfies EvidencesResult
}

export function useCreateEvidences(options: { mutationConfig?: MutationConfig<typeof createEvidences> } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEvidences,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-evidences"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

function updateEvidence({ id, values }: { id: number; values: Partial<CurricularEvidenceDraft> }) {
  const url = enunciadoUrl(id)
  if (env.ENABLE_API_MOCKING) {
    return api.put<{ status: "ok" | "error"; message?: string; evidence: CurricularEvidence }>(url, values)
  }
  return api.patch<{ status?: "ok" | "error"; message?: string; evidence?: CurricularEvidence }>(url, {
    ...(values.text != null ? { TEXTO: values.text } : {}),
    ...(values.active != null ? { ESTADO: values.active ? "A" : "I" } : {}),
  })
}

export function useUpdateEvidence(options: { mutationConfig?: MutationConfig<typeof updateEvidence> } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEvidence,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-evidences"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

function deleteEvidence(id: number) {
  if (env.ENABLE_API_MOCKING) {
    return api.delete<{ status: "ok" | "error"; message: string }>(
      `/academic-management/curricular-evidences/${id}`,
    )
  }
  return api.patch<{ status?: "ok" | "error"; message?: string }>(
    `/eval-col/referentes-curriculares/enunciados/${id}/eliminar`,
  )
}

export function useDeleteEvidence(options: { mutationConfig?: MutationConfig<typeof deleteEvidence> } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEvidence,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-evidences"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}
