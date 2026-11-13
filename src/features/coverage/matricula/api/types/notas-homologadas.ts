/** Escala de valoración del destino al tomar el snapshot; no se recalcula si cambia después. */
export interface EscalaValoracion {
  min: number
  max: number
  desempenos: { nombre: string; desde: number; hasta: number }[]
}

/**
 * DEFINITIVA: período ya calificado en el grupo anterior.
 * PARCIAL: período en curso; pesa `porcentajeCursado` en la definitiva del grupo nuevo.
 * PENDIENTE: [Área] del destino sin equivalente, pendiente por nivelación (Regla 45).
 */
export type TipoNotaHomologada = "DEFINITIVA" | "PARCIAL" | "PENDIENTE"

export interface NotaHomologada {
  id: number
  asignatura: string
  periodo: string
  tipo: TipoNotaHomologada
  /** La vigente; null si está pendiente por nivelación. */
  nota: number | null
  /** Solo en las corregidas: la que se homologó antes de la primera corrección. */
  notaOriginal: number | null
  valoracion: string | null
  porcentajeCursado: number | null
  corregida: boolean
}

/** Foto inmutable de las notas al cambiar de grupo (Sección 4.2). Cada cambio del año toma la suya. */
export interface SnapshotHomologacion {
  id: number
  motivo: string
  fecha: string
  grupoOrigen: string
  institucionOrigen: string
  jornadaOrigen: string
  responsableEnsenanza: string
  grupoActual: string
  confirmadoPor: string
  /** Fallas acumuladas en el grupo anterior; se suman a las del grupo nuevo. */
  fallas: number
  escala: EscalaValoracion
  notas: NotaHomologada[]
}

export interface ActividadOrigen {
  nombre: string
  fecha: string
  nota: number
}

export interface OrigenNota {
  grupoOrigen: string
  responsableEnsenanza: string
  snapshot: string
  nota: number
  valoracion: string
  porcentajeCursado: number | null
  actividades: ActividadOrigen[]
}

/** Par origen → destino que propone el sistema y ajusta quien homologa (Sección 4.2). */
export interface EmparejamientoPeriodo {
  origen: string
  destino: number | null
}

/** `destino` null: sin equivalente; el área del plan queda Pendiente por nivelación. */
export interface EmparejamientoAsignatura {
  origen: string
  destino: number | null
}

/** Snapshot de un traslado que todavía no se homologó, con la propuesta (Sección 4.5). */
export interface SnapshotPendiente {
  id: number
  motivo: string
  fecha: string
  grupoOrigen: string
  institucionOrigen: string
  escalaDistinta: boolean
  periodosPendientes: string[]
  asignaturasPlan: number
  periodosDestino: { id: number; nombre: string }[]
  asignaturasDestino: { id: number; nombre: string }[]
  periodos: EmparejamientoPeriodo[]
  asignaturas: EmparejamientoAsignatura[]
}
