import type { PromotionCriteria } from "./promotion-criteria"

/** Una celda del horario, alineada al backend (fn_horario_guardar). */
export interface ScheduleEntry {
  /** PK_TGRUPO */
  grupoId: number
  /** PK_TASIGNATURA_PLAN (subjectId de la grilla) */
  planItemId: number
  /** PK_LISTA_VALOR del dia (FK_TLV_DIA_SEMANA) */
  diaId: number
  /** Indice de bloque 0-based (0 .. BLOQUES-1) */
  bloque: number
}

export interface GradeSchedule {
  entries: ScheduleEntry[]
}

export interface GradeConfig {
  promotionCriteria?: PromotionCriteria
  schedule?: GradeSchedule
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
