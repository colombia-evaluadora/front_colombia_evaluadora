// Reserva de cupo del período siguiente (Cobertura Educativa, Sección 3.2).
// Contrato: sso V508-V510 (`/cobertura-academica/reservas-cupo/*`).

export const ESTADOS_RESERVA = ["RESERVADA", "SIN_CONTINUIDAD", "LIBERADA", "MATRICULADA"] as const
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number]

export const ESTADOS_TRASLADO = ["PENDIENTE", "ACEPTADO", "RECHAZADO", "CANCELADO"] as const
export type EstadoTraslado = (typeof ESTADOS_TRASLADO)[number]

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
  /** `TGRADO.CODIGO` = `VALOR` del catálogo GRADOS. */
  codigoGrado: string
  /** Sede, jornada y período vienen vacíos en un traslado entrante (aún no tiene ubicación aquí). */
  sede: string
  fkTsede: number | null
  jornada: string
  fkTlvJornada: number | null
  periodoId: number | null
  periodo: string
  estado: EstadoReserva
  origen: OrigenReserva
  confirmadaPorAcudiente: boolean
  estadoTraslado: EstadoTraslado | null
  /** Destino del traslado, para la marca "Traslado pendiente hacia…". */
  destinoTraslado: string | null
  /** Fila de un traslado entrante pendiente (no cuenta en los cupos). */
  trasladoEntrante: boolean
  motivoLiberacion: string | null
}

/** Filtros de la pestaña (en la URL). Sede y jornada son pk; el ciclo es el grupo de admisión. */
export interface ReservasCupoFilters {
  q?: string
  ciclo?: string
  sede?: string
  jornada?: string
  grado?: string
  estado?: EstadoReserva
  estadoTraslado?: EstadoTraslado
  porConfirmar?: boolean
  entrantes?: boolean
}

export interface ReservasCupoQueryRequest {
  filters: ReservasCupoFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface ReservasCupoContadores {
  reservadas: number
  sinContinuidad: number
  porConfirmar: number
  trasladosPorResponder: number
}

export interface ReservasCupoQueryResponse {
  rows: ReservaCupo[]
  pageCount: number
  totalCount: number
  /** Del establecimiento completo: no dependen de los filtros. */
  contadores: ReservasCupoContadores
}

/** Período habilitado para Inscripciones: uno por sede y jornada; el ciclo es su grupo de admisión. */
export interface PeriodoInscripciones {
  id: string
  grupoAdmisionId: string
  /** "2028 · Anual · Ciclo 1". */
  ciclo: string
  fkTsede: number
  sede: string
  fkTlvJornada: number
  jornada: string
  /** ESTADOPERIODO: I (Inscripciones), A (Abierto), C (Cerrado). */
  estado: string
  fechaLimiteMatricula: string | null
}

export interface OpcionCatalogo {
  id: number
  nombre: string
}

export interface ReservasCupoCatalogos {
  periodos: PeriodoInscripciones[]
  grados: { codigo: string; nombre: string }[]
  /** Solo los que admite Liberar manualmente. */
  motivosLiberacion: OpcionCatalogo[]
  /** Sin Traslado a otro establecimiento ni Decisión disciplinaria. */
  motivosRetiro: OpcionCatalogo[]
  motivosTraslado: OpcionCatalogo[]
  motivosRechazoTraslado: OpcionCatalogo[]
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

/** Sede y jornada del establecimiento que ofrecen el grado de la reserva, con su cupo (3.2.2). */
export interface UbicacionReserva {
  fkTgrado: number
  fkTperiodoAcademico: number
  fkTsede: number
  sede: string
  fkTlvJornada: number
  jornada: string
  cupoDisponible: number
}

/** Establecimiento de destino de un traslado (Regla 78). */
export interface DestinoTraslado {
  id: number
  nombre: string
  oficial: boolean
}

/** Sede y jornada del destino que ofrecen el grado (Jornada y sede preferidas). */
export interface UbicacionDestino {
  fkTsede: number
  sede: string
  fkTlvJornada: number
  jornada: string
}

// ---------------------------------------------------------------------------
// Acciones conectadas al back real.

export interface CambiarJornadaSedeInput {
  id: string
  /** El grado (en el período de esa sede y jornada) elegido en las ubicaciones. */
  fkTgrado: number
}

export interface LiberarReservaInput {
  id: string
  motivoId: number
}

export interface RegistrarRetiroInput {
  id: string
  motivoId: number
}

export interface SolicitarTrasladoInput {
  id: string
  /** `null` con destino "Otro (fuera de la plataforma)": va `nombreDestino`. */
  destinoId: number | null
  nombreDestino: string | null
  motivoId: number
  sedePreferidaId: number | null
  jornadaPreferidaId: number | null
  tieneHermano: boolean
  documentoHermano: string | null
  compartirSoportes: boolean
  soporte: File | null
  observacion: string | null
  autorizaDatos: boolean
}
