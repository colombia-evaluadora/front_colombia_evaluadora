/** Tipos de los endpoints `POST /api/eval-col/informes/...`. */

/** Centinela (no PK) de la fila Final dentro de `PERIODOS`; `[-1]` pide solo el Final. */
export const PERIODO_FINAL_ID = -1

/** `final` = nota del año calculada al vuelo, con `periodoId: PERIODO_FINAL_ID`. */
export type ModoPeriodo = "real" | "requerido" | "final"

/** Sin criterio de evaluación llega `cualitativo` (lo normal en preescolar). */
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
  /** Promedio del año calculado al vuelo (solo en `modo_periodo: "final"`). */
  | "final"

/** `BORRADOR` = generada por IA sin revisar; no sale en el boletín hasta guardarla. */
export type ObservacionEstado = "APROBADA" | "MODIFICADA" | "BORRADOR"

/** Sede + año + jornada resuelven el periodo académico. */
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

/** Una fila por período académico: la terna puede resolver más de uno. */
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
  /** Convención del planeador: los códigos negativos de preescolar son válidos. */
  grupoEtiqueta: string
  capacidad: number | null
  estudiantes: number
  /** La del grupo (no la del período académico); solo informativa. */
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
  abreviacion: string | null
  fechaInicio: string
  fechaFin: string
  /** Viene del backend; no recalcular por fechas. */
  termino: boolean
  enCurso: boolean
  calificable: boolean
  /** Cerrado = no se consolida ni se editan observaciones. Ausente = abierto. */
  cerrado: boolean
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
  /** `null` con `cambio_propuesto` = se propone quitar la nota. */
  notaPropuesta: number | null
  valoracion: string | null
  simbolo: string | null
  aprobada: boolean | null
  /** Recuperación (Regla 68): `nota` es la resultante y estas tres la original. */
  conRecuperacion: boolean
  notaOriginal: number | null
  valoracionOriginal: string | null
  simboloOriginal: string | null
  /** Modo requerido: ya le alcanza sin sacar nada más. */
  yaAsegurado: boolean
  /** Modo requerido: `false` = ya perdió (el valor llega aunque supere el máximo). */
  alcanzable: boolean
  /** Por qué no se puede calcular (sin criterio, sin escala…); con valor no se consolida. */
  errorConfiguracion: string | null
}

export interface FilaInforme {
  matriculaId: number
  nombreCompleto: string
  documento: string
  periodoId: number
  periodoNombre: string
  periodoAbreviacion: string | null
  /** Con `formato` decide cómo renderizar; en preescolar `asignaturas` no viene vacío. */
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
  /** Imágenes adjuntas; en la fila Final, las de todo el año. */
  evidencias: number
}

/** Una imagen adjunta a la observación de una actividad (preescolar). */
export interface EvidenciaInforme {
  id: number
  archivoId: number
  nombre: string | null
  peso: number | null
  etiqueta: string | null
  fecha: string | null
  periodoId: number
  periodoNombre: string
  actividadId: number
  actividadTitulo: string | null
  observacion: string | null
  esFavorito: boolean
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
  documento: string | null
  /** Guardadas + actualizadas; el historial no conserva el desglose. */
  asignaturas: number
  /** Porcentaje 0-100 de ese día. No se pinta: no se puede homologar (V474). */
  promedio: number | null
}

export interface HistorialCambio {
  id: number
  grupoId: number
  grupoNombre: string
  /** `null` = informe completo; con valor, una asignatura desde la planilla. */
  asignaturaId: number | null
  asignaturaNombre: string | null
  /** `informe` = guardado completo; el otro origen es la planilla. */
  origen: string | null
  periodoId: number
  periodoNombre: string
  periodoAbreviacion: string | null
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
  /** Regla 55: `nota` es la propuesta pendiente; la vigente, `notaAnterior`. */
  solicitudPendiente: boolean
  notaAnterior: number | null
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
  /** Homologadas: la flecha compara lo que se dibuja, no los porcentajes. */
  definitivaGuardada: number | null
  definitivaProyectada: number | null
  actividades: CeldaPlanilla[]
}

export type ResultadoGuardado = "guardada" | "actualizada" | "sin_cambio" | "sin_proyeccion"

/** Resultado de consolidar el informe: por estudiante, cuántas asignaturas cayeron en cada caso. */
export interface ConsolidacionEstudiante {
  matriculaId: number
  estudiante: string
  /** Asignaturas que no tenían nota consolidada y ahora sí. */
  guardadas: number
  /** Asignaturas cuya nota consolidada cambió. */
  actualizadas: number
  /** Asignaturas sin nota proyectada: no hay nada que consolidar todavía. */
  sinProyeccion: number
  /** Asignaturas que ya estaban consolidadas con el mismo valor. */
  sinCambio: number
  promedio: number | null
  aprobadas: number | null
  reprobadas: number | null
}

export interface DetalleGuardado {
  matriculaId: number
  estudiante: string
  resultado: ResultadoGuardado
  notaAnterior: number | null
  promedio: number | null
  aprobadas: number | null
  reprobadas: number | null
}
