import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type {
  CurricularEvidence,
  CurricularStatement,
  CurricularStatementDraft,
} from "@/features/academic-management/curricular-references/api/types/statement"

interface StatementResult {
  status: "ok" | "error"
  message?: string
  statement: CurricularStatement
}

function createStatement(input: {
  curricularReferenceId: number
  areaId: number
  text: string
  active: boolean
}) {
  return api.post<StatementResult>(
    `/academic-management/curricular-references/${input.curricularReferenceId}/statements`,
    { areaId: input.areaId, text: input.text, active: input.active },
  )
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
  return api.put<StatementResult>(`/academic-management/curricular-statements/${id}`, values)
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
  return api.delete<{ status: "ok" | "error"; message: string }>(
    `/academic-management/curricular-statements/${id}`,
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
  status: "ok" | "error"
  message?: string
  evidences: CurricularEvidence[]
}

function createEvidences(input: { statementId: number; texts: string[]; active: boolean }) {
  return api.post<EvidencesResult>(
    `/academic-management/curricular-statements/${input.statementId}/evidences`,
    { texts: input.texts, active: input.active },
  )
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

function deleteEvidence(id: number) {
  return api.delete<{ status: "ok" | "error"; message: string }>(
    `/academic-management/curricular-evidences/${id}`,
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
