// Actualización de datos por el acudiente y el estudiante (Sección 2.19; Regla 69).
// Contrato en docs/matricula/pendientes-back.md, tarea 30.

/** Un campo configurable; `null` en un perfil = ese perfil no puede actualizarlo («—»). */
export interface CampoActualizable {
  codigo: string
  nombre: string
  /** Bloque del informe que agrupa la fila: «Domicilio del estudiante (2.3)». */
  bloque: string
  acudiente: boolean | null
  estudiante: boolean | null
}

/** Un registro por establecimiento, para todas sus Sedes y Jornadas. */
export interface ConfiguracionActualizacion {
  activo: boolean
  /** yyyy-MM-dd; vacía = abre al encender el interruptor. */
  fechaInicio: string | null
  /** yyyy-MM-dd; vacía = cierra al apagar el interruptor. */
  fechaCierre: string | null
  campos: CampoActualizable[]
}

export type EstadoSolicitud = "PENDIENTE" | "APROBADA" | "RECHAZADA"

/** Solicitud de corrección de un dato de identidad, enviada desde Mi cuenta. */
export interface SolicitudCorreccion {
  solicitudId: number
  solicitante: string
  estudiante: string
  /** «Segundo apellido». */
  dato: string
  valorActual: string
  valorSolicitado: string
  /** yyyy-MM-dd. */
  fecha: string
  estado: EstadoSolicitud
  motivo: string
  soporteId: number | null
  /** Motivo del rechazo; null si está pendiente o aprobada. */
  motivoDecision: string | null
  decididoPor: string | null
  fechaDecision: string | null
}
