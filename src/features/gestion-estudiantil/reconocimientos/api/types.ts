// Contrato de V624-V630 (SSO): las filas llegan en snake_case tal como las devuelven las funciones
// `fn_reconocimiento_*`; los cuerpos de escritura y los parámetros de consulta van en MAYÚSCULAS.

/** Fila de `GET /reconocimientos` (`total_count` se repite en cada fila). */
export interface ReconocimientoRow {
  id: number
  /** `aaaa-mm-dd`. */
  fecha: string
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fk_tlv_tipo: number
  tipo_valor: string
  /** Lo que se muestra: nunca el código. */
  tipo_nombre: string
  motivo: string
  fk_tfuncionario_otorga: number
  otorgado_por: string
  fk_tperiodo_evaluacion: number | null
  periodo_evaluacion_nombre: string | null
  es_sugerencia_puesto: boolean
  anulado: boolean
  puede_modificar: boolean
  puede_anular: boolean
  total_count: number
}

export interface AnulacionReconocimiento {
  fecha: string
  motivo: string
  por: string
}

/** `GET /reconocimientos/:ID` → columna `datos`: la fila más actividad, soporte, autor y anulación. */
export interface ReconocimientoDetalle extends Omit<ReconocimientoRow, "total_count"> {
  fk_tactividad: number | null
  actividad_nombre: string | null
  fk_tarchivo_soporte: number | null
  soporte_nombre: string | null
  registrado_por: string
  anulacion: AnulacionReconocimiento | null
}

/** Fila de `GET /reconocimientos/sugerencias` (solo RECTOR y COORDINADOR; el resto recibe 403). */
export interface SugerenciaPuesto {
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fk_tperiodo_evaluacion: number
  periodo_evaluacion_nombre: string
  /** `aaaa-mm-dd`: la fecha con que nace el reconocimiento. */
  fecha_cierre: string
  motivo_sugerido: string
  fk_tlv_tipo_sugerido: number
}

/** `GET /reconocimientos/:ID/mencion-honor` → columna `datos` (encabezado como el del documento de citaciones). */
export interface MencionHonorDocumento {
  establecimiento: string
  establecimiento_dane: string
  establecimiento_nit: string
  municipio: string
  departamento: string
  /** `pk_tarchivo` del escudo; null = sin escudo. */
  escudo_archivo: number | null
  estudiante: string
  estudiante_documento: string
  grado_grupo: string
  tipo_nombre: string
  motivo: string
  fecha: string
}

/** Fila de `GET /reconocimientos/opciones/estudiantes`. */
export interface OpcionEstudianteReconocimiento {
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fk_tgrupo: number
}

/** Fila de `GET /reconocimientos/opciones/otorgantes`. */
export interface OpcionOtorganteReconocimiento {
  fk_tfuncionario: number
  nombre: string
  /** El funcionario es quien consulta: valor por defecto de «Otorgado por». */
  es_usuario_actual: boolean
}

/** Fila de `GET /gestion-estudiantil/actividades` que usa el selector «Actividad relacionada». */
export interface ActividadOpcion {
  id: number
  nombre: string
}

// Filtros de la UI (valores de combo como texto; "" = sin filtro; `anulados` es "true" o "").

export interface ReconocimientosFiltros {
  sede: string
  jornada: string
  tipo: string
  periodo: string
  anulados: string
}

export const RECONOCIMIENTOS_FILTROS_VACIOS: ReconocimientosFiltros = {
  sede: "",
  jornada: "",
  tipo: "",
  periodo: "",
  anulados: "",
}

/** Parámetros de `GET /reconocimientos` (query-string en MAYÚSCULAS exactas). */
export interface ReconocimientosQueryFilters {
  ESTABLECIMIENTO: number
  SEDE: number | null
  JORNADA: number | null
  TIPO: number | null
  PERIODO: number | null
  SEARCH: string | null
  ANULADOS: boolean
}

// Cuerpos de escritura (`:BODY.X`). Las fechas viajan `aaaa-mm-dd`.

export interface CrearReconocimientoInput {
  MATRICULAS: number[]
  FK_TIPO: number
  MOTIVO: string
  FECHA: string
  FK_OTORGADO_POR: number
  FK_ACTIVIDAD?: number | null
  FK_SOPORTE?: number | null
}

export interface ModificarReconocimientoInput {
  id: number
  FK_TIPO: number
  MOTIVO: string
  FECHA: string
  FK_OTORGADO_POR: number
  FK_ACTIVIDAD?: number | null
  FK_SOPORTE?: number | null
}

export interface AnularReconocimientoInput {
  id: number
  MOTIVO: string
}

export interface OtorgarSugerenciaInput {
  FK_MATRICULA: number
  MOTIVO: string
  FECHA: string
  FK_OTORGADO_POR: number
  FK_ACTIVIDAD?: number | null
  FK_SOPORTE?: number | null
}
