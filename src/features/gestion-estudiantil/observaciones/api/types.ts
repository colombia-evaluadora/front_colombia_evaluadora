// Contrato de V631-V637 (SSO): las filas llegan en snake_case tal como las devuelven las funciones
// `fn_observacion_general_*`; los cuerpos de escritura y los parámetros de consulta van en MAYÚSCULAS.

/** Valores de la lista «Destinatarios de la observación» (usados por el sistema). */
export type DestinatarioObservacion = "TODO_EL_GRUPO" | "ESTUDIANTES_ESPECIFICOS"

/** Fila de `GET /observaciones-sugerencias` (`total_count` se repite en cada fila). */
export interface ObservacionRow {
  pk: number
  /** `aaaa-mm-dd` (el listado la trae con hora en cero). */
  fecha: string
  fk_tgrupo: number
  grado_grupo: string
  fk_tlv_destinatario: number
  destinatario_valor: DestinatarioObservacion
  destinatario_nombre: string
  /** Solo en «Estudiantes específicos». */
  fk_tmatricula: number | null
  estudiante_nombre: string | null
  estudiante_documento: string | null
  /** «Todo el grupo» o el nombre del estudiante: lo que pinta la columna. */
  dirigida_a: string
  titulo: string | null
  observacion: string
  fk_tperiodo_evaluacion: number
  periodo_nombre: string
  registrado_por_nombre: string
  fk_tusuario_registra: number
  anulada: boolean
  /** `ANULADA` o null. */
  estado: string | null
  puede_modificar: boolean
  puede_anular: boolean
  total_count: number
}

/** `GET /observaciones-sugerencias/:ID` → columna `datos`: la fila más conteo, período y anulación. */
export interface ObservacionDetalle extends Omit<ObservacionRow, "total_count"> {
  /** A cuántos estudiantes aplica (1 si es de un estudiante). */
  estudiantes_cuenta: number
  periodo_calificable: boolean
  anulado_en: string | null
  motivo_anulacion: string | null
  anulado_por_nombre: string | null
  created_at: string
}

/** Fila de `POST /observaciones-sugerencias/resumen`: una por grupo elegido. */
export interface ResumenObservacion {
  fk_tgrupo: number
  grado_grupo: string
  /** Estudiantes que la recibirán en ese grupo. */
  estudiantes: number
  /** null si la fecha no cae en ningún Período de Evaluación del grupo. */
  fk_tperiodo_evaluacion: number | null
  periodo_nombre: string | null
  periodo_calificable: boolean
}

/** Fila de `GET /observaciones-sugerencias/opciones/grupos`. */
export interface OpcionGrupoObservacion {
  fk_tgrupo: number
  grado_grupo: string
  fk_tsede: number
  fk_tlv_jornada: number
}

/** Fila de `GET /observaciones-sugerencias/opciones/estudiantes`. */
export interface OpcionEstudianteObservacion {
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  fk_tgrupo: number
  grado_grupo: string
}

// Filtros de la UI (valores de combo como texto; "" = sin filtro).

export interface ObservacionesFiltros {
  sede: string
  jornada: string
  grupo: string
  periodo: string
  /** pk de la lista «Destinatarios de la observación». */
  destinatario: string
}

export const OBSERVACIONES_FILTROS_VACIOS: ObservacionesFiltros = {
  sede: "",
  jornada: "",
  grupo: "",
  periodo: "",
  destinatario: "",
}

/** Parámetros de `GET /observaciones-sugerencias` (query-string en MAYÚSCULAS exactas). */
export interface ObservacionesQueryFilters {
  FK_TESTABLECIMIENTO: number
  FK_TSEDE: number | null
  FK_TLV_JORNADA: number | null
  FK_TGRUPO: number | null
  FK_TPERIODO_EVALUACION: number | null
  FK_TLV_DESTINATARIO: number | null
  SEARCH: string | null
}

// Cuerpos de escritura (`:BODY.X`). Las fechas viajan `aaaa-mm-dd`.

export interface ResumenObservacionInput {
  FK_TGRUPOS: number[]
  DESTINATARIO: DestinatarioObservacion
  FK_TMATRICULAS: number[]
  FECHA: string | null
}

export interface CrearObservacionInput extends ResumenObservacionInput {
  FECHA: string
  TITULO: string | null
  OBSERVACION: string
}

/** `POST /observaciones-sugerencias` → columna `datos`. */
export interface ResultadoCrearObservacion {
  ids: number[]
  registros: number
  /** Para «Observación guardada para [N] estudiantes.» */
  estudiantes: number
}

export interface ModificarObservacionInput {
  id: number
  FECHA: string
  TITULO: string | null
  OBSERVACION: string
}

export interface AnularObservacionInput {
  id: number
  MOTIVO: string
}
