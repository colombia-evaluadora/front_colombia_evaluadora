/** Una celda del horario, alineada al backend (fn_horario_guardar). */
export interface ScheduleEntry {
  /** PK_TGRUPO */
  grupoId: number
  /** PK_TASIGNATURA_PLAN (subjectId de la grilla); null si la asignatura salió del plan (Regla 74) */
  planItemId: number | null
  /** PK_LISTA_VALOR del dia (FK_TLV_DIA_SEMANA) */
  diaId: number
  /** Indice de bloque 0-based (0 .. BLOQUES-1) */
  bloque: number
  /** PK_THORARIO de una celda guardada: reenviada sin cambios, el back la conserva aunque esté afectada. */
  horarioId?: number
  /** Regla 74: un cambio del plan o del horario dejó la celda por corregir. */
  afectado?: boolean
  causa?: ScheduleCellCause | null
  asignatura?: string
}

/** BLOQUES: fuera de la grilla del grado · PLAN: salió del plan · INTENSIDAD: supera sus horas. */
export type ScheduleCellCause = "BLOQUES" | "PLAN" | "INTENSIDAD"
