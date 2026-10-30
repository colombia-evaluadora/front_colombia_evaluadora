export interface CurricularStatement {
  id: number
  curricularReferenceId: number
  areaId: number | null
  /** `fk_tlv_grado`, fijo desde la creación (Regla 11). `null` = todos los grados. */
  gradeId: number | null
  text: string
  active: boolean
  /** Evidencias del enunciado (para el aviso de eliminar). */
  evidenceCount?: number
  /** Ya se usó en unidades o actividades: no admite borrado físico (§2.1). */
  used?: boolean
}

export type CurricularStatementDraft = Omit<CurricularStatement, "id" | "evidenceCount" | "used">

export interface CurricularEvidence {
  id: number
  statementId: number
  text: string
  active: boolean
  /** Ya se usó en actividades: no admite borrado físico (§2.1). */
  used?: boolean
}

export type CurricularEvidenceDraft = Omit<CurricularEvidence, "id" | "used">
