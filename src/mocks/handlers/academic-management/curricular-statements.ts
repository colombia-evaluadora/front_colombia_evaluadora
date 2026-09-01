import { delay, http, HttpResponse } from "msw"

import {
  curricularEvidencesDb,
  curricularStatementsDb,
  deleteEvidence,
  deleteStatement,
  takeNextEvidenceId,
  takeNextStatementId,
  upsertEvidence,
  upsertStatement,
} from "@/mocks/db/academic-management/curricular-statements"

import type {
  CurricularEvidenceDraft,
  CurricularStatementDraft,
} from "@/features/academic-management/curricular-references/api/types/statement"

export const curricularStatementsHandlers = [
  http.get(
    "*/api/academic-management/curricular-references/:referenceId/statements",
    async ({ params, request }) => {
      await delay(200)

      const referenceId = Number(params.referenceId)
      const areaId = Number(new URL(request.url).searchParams.get("areaId"))

      const rows = curricularStatementsDb.filter(
        (item) => item.curricularReferenceId === referenceId && item.areaId === areaId,
      )

      return HttpResponse.json({ rows })
    },
  ),

  http.post(
    "*/api/academic-management/curricular-references/:referenceId/statements",
    async ({ params, request }) => {
      await delay(250)

      const referenceId = Number(params.referenceId)
      const values = (await request.json()) as CurricularStatementDraft
      const statement = upsertStatement({
        ...values,
        id: takeNextStatementId(),
        curricularReferenceId: referenceId,
      })

      return HttpResponse.json({ status: "ok", statement })
    },
  ),

  http.put("*/api/academic-management/curricular-statements/:id", async ({ params, request }) => {
    await delay(250)

    const id = Number(params.id)
    const existing = curricularStatementsDb.find((item) => item.id === id)
    if (!existing) {
      return HttpResponse.json({ status: "error", message: "Enunciado no encontrado." }, { status: 404 })
    }

    const values = (await request.json()) as CurricularStatementDraft
    const statement = upsertStatement({ ...existing, ...values, id })

    return HttpResponse.json({ status: "ok", statement })
  }),

  http.delete("*/api/academic-management/curricular-statements/:id", async ({ params }) => {
    await delay(250)

    const id = Number(params.id)
    deleteStatement(id)

    return HttpResponse.json({ status: "ok", message: "Enunciado eliminado." })
  }),

  http.get("*/api/academic-management/curricular-statements/:statementId/evidences", async ({ params }) => {
    await delay(200)

    const statementId = Number(params.statementId)
    const rows = curricularEvidencesDb.filter((item) => item.statementId === statementId)

    return HttpResponse.json({ rows })
  }),

  http.post(
    "*/api/academic-management/curricular-statements/:statementId/evidences",
    async ({ params, request }) => {
      await delay(250)

      const statementId = Number(params.statementId)
      const body = (await request.json()) as { texts: string[]; active?: boolean }
      const active = body.active ?? true
      const created = body.texts
        .map((text) => text.trim())
        .filter((text) => text.length > 0)
        .map((text) =>
          upsertEvidence({
            id: takeNextEvidenceId(),
            statementId,
            text,
            active,
          }),
        )

      return HttpResponse.json({ status: "ok", evidences: created })
    },
  ),

  http.put("*/api/academic-management/curricular-evidences/:id", async ({ params, request }) => {
    await delay(250)

    const id = Number(params.id)
    const existing = curricularEvidencesDb.find((item) => item.id === id)
    if (!existing) {
      return HttpResponse.json({ status: "error", message: "Evidencia no encontrada." }, { status: 404 })
    }

    const values = (await request.json()) as Partial<CurricularEvidenceDraft>
    const evidence = upsertEvidence({ ...existing, ...values, id })

    return HttpResponse.json({ status: "ok", evidence })
  }),

  http.delete("*/api/academic-management/curricular-evidences/:id", async ({ params }) => {
    await delay(250)

    const id = Number(params.id)
    deleteEvidence(id)

    return HttpResponse.json({ status: "ok", message: "Evidencia eliminada." })
  }),
]
