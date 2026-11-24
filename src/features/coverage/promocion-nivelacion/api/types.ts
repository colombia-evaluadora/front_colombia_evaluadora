// Promoción y nivelación (Sección 4.7; Reglas 64 y 65). Contrato en
// docs/matricula/pendientes-back.md, tarea 28.

export interface Opcion {
  value: string
  label: string
}

export interface OpcionesPromocion {
  anios: number[]
  periodos: (Opcion & { anio: number })[]
  sedes: Opcion[]
  jornadas: Opcion[]
  grados: Opcion[]
  grupos: (Opcion & { grado: string })[]
}

export interface AreaReprobada {
  abreviatura: string
  nombre: string
}

/** Pestaña Reprobados: matrícula principal Reprobado de un grado con grado siguiente. */
export interface Reprobado {
  matriculaId: number
  documento: string
  estudiante: string
  grado: string
  grupo: string
  areasReprobadas: AreaReprobada[]
  rendimiento: number
  /** Mayor porcentaje de inasistencia entre sus [Áreas]. */
  mayorInasistencia: number
}

/** Una fila por [Área] al abrir un estudiante (Gestión Académica, Sección 8). */
export interface AreaDelAnio {
  area: string
  ih: number
  notaFinal: number
  aprobo: boolean
  inasistencia: number
}

export interface PreviaPromover {
  matriculaId: number
  estudiante: string
  grupo: string
  areas: AreaReprobada[]
  /** Cierre académico de la matrícula: la fecha del acta no puede ser anterior. */
  fechaCierre: string
  /** Fin del Período Académico siguiente (el de su reserva): tope del plazo para nivelar; null si aún no existe. */
  finPeriodoSiguiente: string | null
  /** «[Estudiante] ya tiene matrícula en [Período]…»: no se promueve. */
  bloqueo: string | null
}

export interface ResultadoPromover {
  matriculaId: number
  ok: boolean
  mensaje: string | null
}

export type Seguimiento = "CON_PENDIENTES" | "VENCIDO" | "NIVELADO"

/** Pestaña Áreas pendientes: un estudiante promovido con áreas pendientes. */
export interface Promovido {
  promocionId: number
  documento: string
  estudiante: string
  /** «Noveno · 2027». */
  promovidoDe: string
  /** Grado del que se promovió (anular lo devuelve a ese grado). */
  grado: string
  anio: number
  /** Grupo de su matrícula en el período siguiente; null si aún no tiene. */
  grupoActual: string | null
  /** Nombres de las áreas que siguen pendientes. */
  areasPendientes: string[]
  niveladas: number
  total: number
  plazo: string
  seguimiento: Seguimiento
}

export interface Intento {
  id: number
  fecha: string
  nota: number
  responsable: string
  soporteId: number | null
  observacion: string | null
  corregidoPor: string | null
}

export interface AreaPendiente {
  id: number
  area: string
  notaFinal: number
  estado: "PENDIENTE" | "NIVELADA"
  intentos: Intento[]
}

export interface DetallePromocion {
  promocionId: number
  estudiante: string
  acta: string
  fechaActa: string
  plazo: string
  /** Fin del Período Académico siguiente (el de su reserva o, sin reserva, el siguiente según la modalidad): tope de Ampliar plazo. */
  finPeriodo: string
  /** Mínimo del Formato de calificación y Nota Máxima de Recuperación. */
  notaMinima: number
  notaMaxima: number
  areas: AreaPendiente[]
}
