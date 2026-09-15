export type PeriodoId = 1 | 2 | 3 | 4

export interface PeriodoOption {
  id: PeriodoId
  label: string
}

/** Notas de un estudiante en un período: resumen + una por asignatura. */
export interface NotasPeriodo {
  promedio: number
  puesto: number
  areasPerdidas: number
  recuperaciones: number
  asignaturas: Record<string, number>
  /**
   * `false` = nota proyectada por el sistema según actividades ya
   * calificadas, aún no confirmada (se muestra en gris). Pasa a `true`
   * solo cuando el usuario selecciona al estudiante y da "Guardar" — recién
   * ahí se puede incluir en la generación de boletines.
   */
  confirmado: boolean
}

export interface EstudianteInforme {
  id: number
  documento: string
  nombreCompleto: string
  jornada?: string
  notasPorPeriodo: Partial<Record<PeriodoId, NotasPeriodo>>
  /**
   * Solo para grupos de preescolar (`GrupoInforme.preescolar`): en vez de
   * nota numérica, cada período tiene una observación en texto libre,
   * escrita por el docente. La ausencia de la clave (no un texto vacío)
   * distingue "sin observación todavía".
   */
  observacionesPorPeriodo?: Partial<Record<PeriodoId, string>>
}

export interface GrupoInforme {
  id: number
  nombre: string
  /** Preescolar no califica con notas — evalúa con una observación de texto
   *  por estudiante y período (ver `observacionesPorPeriodo`). */
  preescolar?: boolean
  estudiantes: EstudianteInforme[]
}

export interface ColumnaAsignatura {
  key: string
  label: string
  descripcion: string
}

/** Un docente que editó su planilla después del cierre del período —
 *  requiere aprobación o rechazo del administrador antes de que ese cambio
 *  cuente para el informe. */
export interface DocenteConCambioPendiente {
  id: number
  nombreDocente: string
  asignatura: string
  gradoGrupo: string
}

export interface CambiosPendientesInfo {
  /** Total de docentes con cambios pendientes en todo el establecimiento —
   *  puede ser mayor que `grupos.length`, que solo lista los de los
   *  grados/grupos con pestaña abierta en esta vista. */
  totalDocentes: number
  grupos: DocenteConCambioPendiente[]
}
