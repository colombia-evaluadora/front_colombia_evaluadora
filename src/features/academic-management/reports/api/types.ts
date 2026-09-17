/** Tipos de los endpoints `POST /api/eval-col/informes/...`. */

export type ModoPeriodo = "real" | "requerido"

/** Sin criterio de evaluación configurado el backend responde `cualitativo`
 *  — esa es la vía normal de preescolar, no un hueco de datos. */
export type FormatoPeriodo = "numerico" | "cualitativo"

export type EstadoNota =
  | "sin_nota"
  /** Hay proyección y nunca se consolidó — gris. */
  | "proyectada"
  /** Consolidada y la proyección coincide — negro. */
  | "guardada"
  /** Consolidada pero la proyección difiere — negro + gris. */
  | "cambio_propuesto"
  /** Lo que le falta sacar (solo en `modo_periodo: "requerido"`). */
  | "requerido"

export type ObservacionEstado = "APROBADA" | "MODIFICADA"

/** La terna sede + año + jornada resuelve un periodo académico, y de ahí
 *  salen los períodos de evaluación y los grupos. */
export interface SedeInforme {
  id: number
  nombre: string
  establecimientoId: number
  establecimientoNombre: string
}

export interface AnioInforme {
  anio: number
  esActual: boolean
}

/** Una fila por período académico, no por jornada distinta: la terna puede
 *  resolver más de uno y ningún índice lo impide. */
export interface JornadaInforme {
  id: number
  nombre: string
  periodoAcademicoId: number
  periodoAcademicoNombre: string
  fechaInicio: string
  fechaFin: string
  enCurso: boolean
}

export interface GrupoPeriodo {
  grupoId: number
  grupoCodigo: string | null
  grupoNombre: string
  /** Armada con la misma convención del planeador — los códigos negativos de
   *  preescolar son correctos. */
  grupoEtiqueta: string
  capacidad: number | null
  estudiantes: number
  /** La del grupo, que casi nunca es la del período académico: el endpoint no
   *  filtra por ella, solo la devuelve. */
  jornadaId: number | null
  jornadaNombre: string | null
  gradoId: number
  gradoCodigo: string | null
  gradoNombre: string
  nivelEnsenanzaId: number | null
  nivelEnsenanzaNombre: string | null
  directorId: number | null
  directorNombre: string | null
  periodoAcademicoId: number
}

export interface PeriodoInforme {
  id: number
  nombre: string
  fechaInicio: string
  fechaFin: string
  /** Es la misma condición con la que el backend arma la alerta roja — no
   *  recalcularla por fechas desde acá. */
  termino: boolean
  enCurso: boolean
  calificable: boolean
  sede: string | null
  jornada: string | null
}

export interface AsignaturaInforme {
  asignaturaId: number
  nombre: string
  abreviacion: string
  area: string | null
  orden: number
  estado: EstadoNota
  esNumerico: boolean
  nota: number | null
  /** `null` con estado `cambio_propuesto` significa "la propuesta es que ya
   *  no hay nota": el docente dio de baja las actividades. */
  notaPropuesta: number | null
  valoracion: string | null
  simbolo: string | null
  aprobada: boolean | null
  /** Modo requerido: ya le alcanza sin sacar nada más. */
  yaAsegurado: boolean
  /** Modo requerido: `false` = ya perdió pase lo que pase. El valor llega
   *  igual aunque supere el máximo. */
  alcanzable: boolean
}

export interface FilaInforme {
  matriculaId: number
  estudianteId: number
  nombreCompleto: string
  documento: string
  periodoId: number
  periodoNombre: string
  /** Junto con `formato` deciden cómo renderizar. En preescolar
   *  `asignaturas` llega con filas en `null`, así que mirar si viene vacío
   *  no sirve para distinguirlo. */
  modoPeriodo: ModoPeriodo
  formato: FormatoPeriodo
  esCualitativo: boolean
  consolidado: boolean
  promedioGuardado: number | null
  promedioProyectado: number | null
  puesto: number | null
  aprobadas: number
  reprobadas: number
  asignaturas: AsignaturaInforme[]
  observacion: string | null
  observacionEstado: ObservacionEstado | null
  observacionDesactualizada: boolean
  tieneCambiosPropuestos: boolean
}

export interface PlanillaPendiente {
  grupoId: number
  grupoNombre: string
  asignaturaId: number
  asignaturaNombre: string
  periodoId: number
  periodoNombre: string
  funcionarioId: number | null
  docente: string | null
  /** `0` = el docente ni siquiera armó las actividades. */
  actividades: number
  docentesAsignados: number
}

export interface CambioPendiente {
  grupoId: number
  grupoNombre: string
  asignaturaId: number
  asignaturaNombre: string
  periodoId: number
  periodoNombre: string
  funcionarioId: number | null
  docente: string | null
  estudiantesAfectados: number
  docentesAsignados: number
}

export interface HistorialDetalle {
  matriculaId: number
  estudiante: string
  documento: string
  /** El del momento del guardado — no se recalcula al consultar. */
  promedio: number | null
  asignaturas: number
}

export interface HistorialCambio {
  id: number
  grupoId: number
  grupoNombre: string
  /** `null` = se guardó el informe completo; con valor, una sola asignatura
   *  desde la planilla. */
  asignaturaId: number | null
  asignaturaNombre: string | null
  periodoId: number
  periodoNombre: string
  usuario: string | null
  fecha: string
  momento: string
  /** Por estudiante: guardar un curso de 30 son 30 cambios. */
  estudiantes: number
  detalle: HistorialDetalle[]
}

export type EstadoCeldaPlanilla = "CALIFICADA" | "PENDIENTE" | "NO_ASIGNADA" | "NO_CALIFICABLE"

export interface CeldaPlanilla {
  orden: number
  actividadId: number
  titulo: string
  actividadEstudianteId: number | null
  estado: EstadoCeldaPlanilla
  porcentaje: number | null
  nota: number | null
  valoracion: string | null
  observacion: string | null
  esEvaluativa: boolean
  ponderacion: number | null
  notaMaxima: number | null
  instrumento: string | null
  fechaInicio: string | null
  fechaCierre: string | null
}

export interface FilaPlanilla {
  matriculaId: number
  estudianteId: number
  nombreCompleto: string
  /** Ambas homologadas a la escala del colegio: la flecha se decide
   *  comparando lo que se dibuja, no los porcentajes. */
  definitivaGuardada: number | null
  definitivaProyectada: number | null
  actividades: CeldaPlanilla[]
}

export type ResultadoGuardado = "guardada" | "actualizada" | "sin_cambio" | "sin_proyeccion"

export interface DetalleGuardado {
  matriculaId: number
  estudiante: string
  resultado: ResultadoGuardado
  notaAnterior: number | null
  promedio: number | null
  aprobadas: number | null
  reprobadas: number | null
}
