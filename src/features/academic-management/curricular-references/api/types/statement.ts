export interface CurricularStatement {
  id: number
  curricularReferenceId: number
  areaId: number
  text: string
  active: boolean
}

export type CurricularStatementDraft = Omit<CurricularStatement, "id">

export interface CurricularEvidence {
  id: number
  statementId: number
  text: string
  active: boolean
}

export type CurricularEvidenceDraft = Omit<CurricularEvidence, "id">
