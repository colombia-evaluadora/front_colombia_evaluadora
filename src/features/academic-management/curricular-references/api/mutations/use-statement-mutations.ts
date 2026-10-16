import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
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

/** Resultado común de las escrituras que pueden quedar en la outbox. */
export interface Queued {
  /** `true` = se guardó en este equipo y se enviará al volver la conexión. */
  queued?: boolean
}

const RUTA_REFERENTES = "/app/gestion-academica/referentes-curriculares"

type CreateStatementInput = {
  curricularReferenceId: number
  areaId: number | null
  gradeId: number | null
  text: string
  active: boolean
}

/**
 * Fase 4 offline (`add-offline-rest`): enunciados y evidencias se encolan en
 * la outbox. Un enunciado creado sin red NO tiene id hasta sincronizar, así que
 * no se le pueden colgar evidencias offline (la UI las pide sobre un enunciado
 * ya existente). Editar/eliminar se fusionan por enunciado: la última edición
 * gana (`coalesce`); un eliminar posterior viaja detrás, en orden FIFO.
 */
registerOutboxHandler<CreateStatementInput>({
  kind: "referente.enunciado.crear",
  version: 1,
  // Cada creación es su propia entidad (no se fusionan dos enunciados nuevos).
  entityKey: (p) => `referente:${p.curricularReferenceId}:nuevo:${p.text}`,
  send: (p) => sendCreateStatement(p),
  invalidates: () => [["curricular-statements"], ["curricular-reference-grades"], ["curricular-reference"], ["curricular-references"]],
  describe: (p) => ({ titulo: "Nuevo enunciado", detalle: p.text.slice(0, 80), ruta: RUTA_REFERENTES }),
})

type UpdateEnunciadoPayload = { id: number; values: Partial<CurricularStatementDraft>; evidence?: boolean }

registerOutboxHandler<UpdateEnunciadoPayload>({
  kind: "referente.enunciado.editar",
  version: 1,
  entityKey: (p) => `referente:enunciado:${p.id}`,
  coalesce: (prev, next) => ({ ...next, values: { ...prev.values, ...next.values } }),
  send: (p) => (p.evidence ? sendUpdateEvidence(p) : sendUpdateStatement(p)),
  invalidates: (p) => (p.evidence ? [["curricular-evidences"]] : [["curricular-statements"]]),
  describe: (p) => ({
    titulo: p.evidence ? "Edición de evidencia" : "Edición de enunciado",
    detalle: p.values.text?.slice(0, 80) ?? (p.values.active != null ? (p.values.active ? "Activar" : "Inactivar") : `#${p.id}`),
    ruta: RUTA_REFERENTES,
  }),
})

type DeleteEnunciadoPayload = { id: number; evidence?: boolean }

registerOutboxHandler<DeleteEnunciadoPayload>({
  kind: "referente.enunciado.eliminar",
  version: 1,
  entityKey: (p) => `referente:enunciado:${p.id}`,
  send: (p) => (p.evidence ? sendDeleteEvidence(p.id) : sendDeleteStatement(p.id)),
  invalidates: () => [["curricular-statements"], ["curricular-evidences"], ["curricular-reference-grades"], ["curricular-reference"], ["curricular-references"]],
  describe: (p) => ({ titulo: p.evidence ? "Eliminar evidencia" : "Eliminar enunciado", detalle: `#${p.id}`, ruta: RUTA_REFERENTES }),
})

type CreateEvidencePayload = { curricularReferenceId: number; statementId: number; text: string; active: boolean }

registerOutboxHandler<CreateEvidencePayload>({
  kind: "referente.evidencia.crear",
  version: 1,
  entityKey: (p) => `referente:enunciado:${p.statementId}:evidencia-nueva:${p.text}`,
  send: (p) => sendCreateEvidences({ ...p, texts: [p.text] }),
  invalidates: () => [["curricular-evidences"]],
  describe: (p) => ({ titulo: "Nueva evidencia", detalle: p.text.slice(0, 80), ruta: RUTA_REFERENTES }),
})

async function createStatement(input: CreateStatementInput): Promise<StatementResult & Queued> {
  const outcome = await runOrQueue<CreateStatementInput, StatementResult>("referente.enunciado.crear", input)
  return outcome.queued ? { status: "ok", queued: true } : outcome.result
}

async function updateStatement(input: { id: number; values: Partial<CurricularStatementDraft> }): Promise<StatementResult & Queued> {
  const outcome = await runOrQueue<UpdateEnunciadoPayload, StatementResult>("referente.enunciado.editar", input)
  return outcome.queued ? { status: "ok", queued: true } : outcome.result
}

async function deleteStatement(id: number): Promise<{ status?: "ok" | "error"; message?: string } & Queued> {
  const outcome = await runOrQueue<DeleteEnunciadoPayload, { status?: "ok" | "error"; message?: string }>(
    "referente.enunciado.eliminar",
    { id },
  )
  return outcome.queued ? { status: "ok", queued: true } : outcome.result
}

async function updateEvidence(input: { id: number; values: Partial<CurricularEvidenceDraft> }): Promise<StatementResult & Queued> {
  const outcome = await runOrQueue<UpdateEnunciadoPayload, StatementResult>("referente.enunciado.editar", {
    ...input,
    evidence: true,
  })
  return outcome.queued ? { status: "ok", queued: true } : outcome.result
}

async function deleteEvidence(id: number): Promise<{ status?: "ok" | "error"; message?: string } & Queued> {
  const outcome = await runOrQueue<DeleteEnunciadoPayload, { status?: "ok" | "error"; message?: string }>(
    "referente.enunciado.eliminar",
    { id, evidence: true },
  )
  return outcome.queued ? { status: "ok", queued: true } : outcome.result
}

/** Una op por texto: si se corta la red a mitad, se sabe cuáles entraron. */
async function createEvidences(input: {
  curricularReferenceId: number
  statementId: number
  texts: string[]
  active: boolean
}): Promise<EvidencesResult & Queued> {
  const evidences: CurricularEvidence[] = []
  let queued = false
  for (const text of input.texts) {
    const outcome = await runOrQueue<CreateEvidencePayload, EvidencesResult>("referente.evidencia.crear", {
      curricularReferenceId: input.curricularReferenceId,
      statementId: input.statementId,
      text,
      active: input.active,
    })
    if (outcome.queued) queued = true
    else evidences.push(...(outcome.result.evidences ?? []))
  }
  return { status: "ok", evidences, queued }
}

// Grados y "Grados vinculados" dependen de los enunciados de nivel 1.
function invalidateStatementDerived(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["curricular-statements"] })
  queryClient.invalidateQueries({ queryKey: ["curricular-reference-grades"] })
  queryClient.invalidateQueries({ queryKey: ["curricular-reference"] })
  queryClient.invalidateQueries({ queryKey: ["curricular-references"] })
}

async function sendCreateStatement(input: {
  curricularReferenceId: number
  areaId: number | null
  /** Grado del filtro; queda fijo desde la creación (Regla 11). */
  gradeId: number | null
  text: string
  active: boolean
}): Promise<StatementResult> {
  const url = statementsUrl(input.curricularReferenceId)
  if (env.ENABLE_API_MOCKING) {
    return api.post<StatementResult>(url, {
      areaId: input.areaId,
      gradeId: input.gradeId,
      text: input.text,
      active: input.active,
    })
  }
  const raw = await api.post<CreateStatementResponse>(url, {
    TEXTO: input.text,
    AREA_ID: input.areaId,
    ...(input.gradeId != null ? { GRADO_ID: input.gradeId } : {}),
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
    networkMode: "always",
    ...options.mutationConfig,
    onSuccess: (...args) => {
      invalidateStatementDerived(queryClient)
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

function sendUpdateStatement({ id, values }: { id: number; values: Partial<CurricularStatementDraft> }) {
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
    networkMode: "always",
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-statements"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

function sendDeleteStatement(id: number) {
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
    networkMode: "always",
    ...options.mutationConfig,
    onSuccess: (...args) => {
      invalidateStatementDerived(queryClient)
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

async function sendCreateEvidences(input: {
  curricularReferenceId: number
  statementId: number
  texts: string[]
  active: boolean
}): Promise<EvidencesResult> {
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
    networkMode: "always",
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-evidences"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

function sendUpdateEvidence({ id, values }: { id: number; values: Partial<CurricularEvidenceDraft> }) {
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
    networkMode: "always",
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-evidences"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

function sendDeleteEvidence(id: number) {
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
    networkMode: "always",
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-evidences"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}
