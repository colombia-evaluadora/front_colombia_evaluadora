import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"

// Inscripciones del establecimiento (Cobertura Educativa, Sección 3.3).

export const ESTADOS_OPCION = [
  "PENDIENTE",
  "EN_LISTA_ESPERA",
  "ADMITIDA",
  "NO_ADMITIDA",
  "DESCARTADA",
] as const
export type EstadoOpcion = (typeof ESTADOS_OPCION)[number]

/** Estados que la lista muestra por defecto: los que aún se pueden admitir. */
export const ESTADOS_OPCION_POR_DEFECTO: EstadoOpcion[] = ["PENDIENTE", "EN_LISTA_ESPERA"]

export const ESTADOS_INSCRIPCION = [
  "INSCRITA",
  "EN_LISTA_ESPERA",
  "POR_ELEGIR",
  "ADMITIDA",
  "ANULADA",
] as const
export type EstadoInscripcion = (typeof ESTADOS_INSCRIPCION)[number]

export const SITUACIONES_EDAD = [
  "EN_EDAD",
  "PREEXTRAEDAD",
  "EXTRAEDAD",
  "BAJA_EDAD",
  "SIN_CALCULAR",
] as const
export type SituacionEdad = (typeof SITUACIONES_EDAD)[number]

export type Desempate = "SORTEO" | "ORDEN_INSCRIPCION"

/** Una fila = la opción de una inscripción en el grado y la jornada elegidos. */
export interface OpcionInscripcion {
  id: string
  inscripcionId: string
  /** Orden de admisión (Regla 28). */
  posicion: number
  numeroInscripcion: string
  aspirante: string
  documento: string
  documentosIncompletos: boolean
  /** Qué documentos faltan, para el texto emergente de la marca. */
  documentosFaltantes: string[]
  /** Criterio de prioridad cumplido; null si no cumple ninguno. */
  prioridad: string | null
  numeroSorteo: string | null
  preferencia: number
  estadoOpcion: EstadoOpcion
  estadoInscripcion: EstadoInscripcion
  situacionEdad: SituacionEdad
  /** Cantidad de opciones de la inscripción (para Ampliar: menos de tres). */
  totalOpciones: number
}

export interface InscripcionesFilters {
  grado: string
  jornada?: string
  q?: string
  estados?: EstadoOpcion[]
}

export interface InscripcionesQueryRequest {
  filters: InscripcionesFilters
  pageIndex: number
  pageSize: number
}

export interface InscripcionesQueryResponse {
  rows: OpcionInscripcion[]
  pageCount: number
  totalCount: number
  cuposDisponibles: number
}

/** Grupo de admisión y lo que la lista necesita de su configuración (Sección 3.7). */
export interface GrupoAdmision {
  id: string
  /** Establecimiento que consulta; solo con el backend real. */
  establecimientoId?: number
  anio: number
  modalidad: string
  ciclo: number
  desempate: Desempate
  /** Fecha de cierre de inscripción: el sorteo se ejecuta ese día. */
  fechaCierre: string
  sorteoEjecutado: boolean
  grados: string[]
  jornadas: string[]
}

/** Opción de cupo dentro del detalle de una inscripción (hasta tres). */
export interface OpcionCupoInscripcion {
  /** PK de la opción: Elegir opción trabaja sobre ella. */
  id: string
  preferencia: number
  establecimiento: string
  sede: string
  jornada: string
  numeroSorteo: string | null
  estado: EstadoOpcion
  hermanoVerificado: boolean
}

export type RevisionSoporte = "SOPORTADO" | "SIN_REVISAR" | "SIN_ARCHIVO" | "RECHAZADO"

export interface SoporteInscripcion {
  id: string
  nombre: string
  /** Nombre del archivo, o "N archivos" si hay varios; null si no hay. */
  archivo: string | null
  revision: RevisionSoporte
}

export interface InscripcionDetalle {
  id: string
  numeroInscripcion: string
  grado: string
  estado: EstadoInscripcion
  documentoHermano: string | null
  opciones: OpcionCupoInscripcion[]
  estudiante: {
    tipoDocumento: string
    documento: string
    genero: string
    primerNombre: string
    segundoNombre: string | null
    primerApellido: string
    segundoApellido: string | null
    fechaNacimiento: string
    paisOrigen: string
    lugarExpedicion: string
    lugarNacimiento: string
    etnia: string
    lenguaMaterna: string
    condicionMigratoria: string
  }
  acudiente: {
    parentesco: string
    tipoDocumento: string
    documento: string
    nombre: string
    primerApellido: string
    segundoApellido: string | null
    telefono: string
    email: string
  }
  soportes: SoporteInscripcion[]
}

/** Opción elegida al editar: hasta tres, en orden de preferencia. */
export interface OpcionCupoInput {
  establecimiento: string
  sede: string
  jornada: string
}

/** Body de Editar inscripción: los datos de la persona y el grado con sus opciones. */
export interface EditarInscripcionInput {
  id: string
  /** Mismas secciones que la matrícula (`CreateMatriculaInput` sin `academic`). */
  datos: Omit<CreateMatriculaInput, "academic">
  paisOrigen: string
  lenguaMaterna: string
  condicionMigratoria: string
  grado: string
  opciones: OpcionCupoInput[]
  foto: File | null
  /** null = no tiene hermano en los establecimientos de las opciones. */
  documentoHermano: string | null
  /** Autorización de tratamiento de datos (Ley 1581): obligatoria al crear. */
  autorizaDatos: boolean
}

/** Lista publicable del sorteo (Sección 3.7, Regla 53): sin datos personales, en orden de admisión. */
export interface ListaSorteo {
  establecimiento: { nombre: string; dane: string; nit: string; municipio: string }
  grupoAdmision: string
  grado: string
  /** null = todas las jornadas. */
  jornada: string | null
  fechaSorteo: string
  /** yyyy-MM-dd'T'HH:mm */
  generadoEl: string
  rows: {
    posicion: number
    numeroInscripcion: string
    prioridad: string | null
    numeroSorteo: string | null
    estadoOpcion: EstadoOpcion
  }[]
}
