export interface CurricularStatement {
  id: number
  curricularReferenceId: number
  areaId: number | null
  /** `fk_tlv_grado`, fijo desde la creación (Regla 11). `null` = todos los grados. */
  gradeId: number | null
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
