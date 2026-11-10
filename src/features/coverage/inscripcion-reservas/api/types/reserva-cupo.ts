// Reserva de cupo del período siguiente (Cobertura Educativa, Sección 3.2).

export const ESTADOS_RESERVA = ["RESERVADA", "SIN_CONTINUIDAD", "LIBERADA", "MATRICULADA"] as const
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number]

export const ESTADOS_TRASLADO = ["PENDIENTE", "ACEPTADO", "RECHAZADO", "CANCELADO"] as const
export type EstadoTraslado = (typeof ESTADOS_TRASLADO)[number]

// Filtros rápidos: los contadores sobre la lista.
export const FILTROS_RAPIDOS = [
  "TODAS",
  "RESERVADAS",
  "SIN_CONTINUIDAD",
  "POR_CONFIRMAR",
  "TRASLADOS_POR_RESPONDER",
] as const
export type FiltroRapido = (typeof FILTROS_RAPIDOS)[number]

export type OrigenReserva =
  | "PREMATRICULA"
  | "RESERVAR_CUPOS"
  | "TRASLADO"
  | "REDISTRIBUCION"
  | "INSCRIPCION"

export interface ReservaCupo {
  id: string
  estudiante: string
  documento: string
  /** Solo en traslados entrantes: el establecimiento que lo envía. */
  establecimientoOrigen: string | null
  grado: string
  sede: string
  jornada: string
  periodo: string
  estado: EstadoReserva
  origen: OrigenReserva
  confirmadaPorAcudiente: boolean
  estadoTraslado: EstadoTraslado | null
  /** Destino del traslado pendiente, para la marca "Traslado pendiente hacia…". */
  destinoTraslado: string | null
  /** Fila de un traslado entrante pendiente (no cuenta en los cupos). */
  trasladoEntrante: boolean
  motivoLiberacion: string | null
}

export interface ReservasCupoFilters {
  q?: string
  rapido?: FiltroRapido
  sede?: string
  jornada?: string
  grado?: string
  estado?: EstadoReserva
  estadoTraslado?: EstadoTraslado
}

export interface ReservasCupoQueryRequest {
  filters: ReservasCupoFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface ReservasCupoContadores {
  todas: number
  reservadas: number
  sinContinuidad: number
  porConfirmar: number
  trasladosPorResponder: number
}

export interface ReservasCupoQueryResponse {
  rows: ReservaCupo[]
  pageCount: number
  totalCount: number
  /** Los contadores ignoran el filtro rápido, pero no la búsqueda ni los filtros. */
  contadores: ReservasCupoContadores
}

/** Período del Establecimiento en estado Inscripciones (destino de las reservas). */
export interface PeriodoInscripciones {
  id: string
  sede: string
  jornada: string
  anio: number
  modalidad: string
  ciclo: number
}

export interface ReservasCupoCatalogos {
  sedes: string[]
  jornadas: string[]
  grados: string[]
}

export interface ReservarCuposInput {
  periodoIds: string[]
}

export interface ReservarCuposResumen {
  creadas: number
  sinContinuidad: number
  omitidos: {
    total: number
    conReserva: number
    sinGradoSiguiente: number
    sinPeriodoContinuidad: number
    /** Solo sector No oficial: sanción con No renovación del cupo. */
    noRenovacion: number
  }
}

// ---------------------------------------------------------------------------
// Detalle y acciones sobre una reserva (Sección 3.2, "Acciones sobre una reserva").

export type TipoCupo = "OFICIAL" | "CONTRATADO"

export interface DatosTraslado {
  establecimientoDestino: string
  motivo: string
  jornadaSedePreferida: string | null
  hermanoVerificado: boolean | null
  compartirSoportes: boolean
  observacion: string | null
  estado: EstadoTraslado
  respondidoPor: string | null
  fechaRespuesta: string | null
  motivoRechazo: string | null
}

export interface CambioReserva {
  id: string
  fecha: string
  usuario: string
  cambio: string
  valorAnterior: string | null
  valorNuevo: string | null
}

export interface ReservaCupoDetalle extends ReservaCupo {
  tipoDocumento: string
  matriculaOrigen: string
  decisionPrematricula: string
  periodoAcademico: string
  tipoCupo: TipoCupo
  fechaReserva: string
  asignadaPor: string
  traslado: DatosTraslado | null
  historial: CambioReserva[]
}

/** Jornada y sede del establecimiento con cupo en el grado de la reserva. */
export interface OpcionCupo {
  jornada: string
  sede: string
}

export interface GrupoConCupo {
  id: string
  codigo: string
  cuposDisponibles: number
}

export interface CatalogosAcciones {
  establecimientosDestino: string[]
  motivosTraslado: string[]
  motivosLiberacion: string[]
  motivosRetiro: string[]
  especialidades: string[]
  /** Jornada y sede que el acudiente puede preferir en el destino. */
  jornadasSedesDestino: string[]
}

export interface CambiarJornadaSedeInput {
  id: string
  jornada: string
  sede: string
}

export interface SolicitarTrasladoInput {
  id: string
  establecimientoDestino: string
  /** Solo con destino "Otro (fuera de la plataforma)". */
  nombreDestino: string | null
  motivo: string
  jornadaSedePreferida: string | null
  tieneHermano: boolean
  documentoHermano: string | null
  compartirSoportes: boolean
  soporte: File | null
  observacion: string | null
  autorizaDatos: boolean
}

export interface LiberarReservaInput {
  id: string
  motivo: string
}

export interface RegistrarRetiroInput {
  id: string
  motivo: string
}

export interface AsignarGrupoInput {
  id: string
  grupoId: string
  especialidad: string | null
  mediaTecnicaExterna: boolean
}

/** Asignar grupo por lote (Sección 3.6): mismas reservas de un grado y jornada. */
export interface AsignarGrupoLoteInput {
  ids: string[]
  grupoId: string
}
