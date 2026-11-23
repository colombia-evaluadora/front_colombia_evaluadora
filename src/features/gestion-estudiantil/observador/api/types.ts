/** Fila de `POST /gestion-estudiantil/observador/query` (fn_observador_anotacion_listar, V545.6). */
export interface AnotacionRow {
  id: number
  fecha: string
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string | null
  fk_tgrupo: number
  grado_grupo: string
  fk_tsede: number
  sede_nombre: string | null
  fk_tlv_jornada: number | null
  jornada_nombre: string | null
  fk_tperiodo_evaluacion: number | null
  periodo_evaluacion_nombre: string | null
  fk_tcomportamiento: number
  codigo: string
  descripcion: string
  fk_tlv_tipo: number
  tipo_nombre: string
  fk_tlv_situacion: number | null
  situacion_nombre: string | null
  /** Tipo II/III (Regla 1): solo la ven el autor, el director del grupo, orientación y la sede. */
  confidencial: boolean
  observacion: string | null
  preocupa_permanencia: boolean
  requiere_mediacion: boolean
  fk_tfuncionario: number
  responsable_nombre: string | null
  es_propia: boolean
  anulada: boolean
  anulado_en: string | null
  motivo_anulacion: string | null
  anulado_por_nombre: string | null
  /** POSITIVO, NEGATIVO o NEUTRO: el color del tipo no se decide por la etiqueta. */
  tipo_codigo: string | null
  fk_tproceso_disciplinario: number | null
  puede_abrir_proceso: boolean
  /** Caso de convivencia que creó la anotación (Regla 8), si lo hay. */
  fk_tcaso_convivencia: number | null
  puede_modificar: boolean
  puede_anular: boolean
  total_count?: number
}

/** Fila de `POST /gestion-estudiantil/catalogo-anotaciones/selector`: códigos activos del establecimiento. */
export interface CodigoAnotacion {
  id: number
  codigo: string
  descripcion: string
  fk_tlv_tipo: number
  tipo_nombre: string
  fk_tlv_situacion: number | null
  situacion_codigo: "TIPO_I" | "TIPO_II" | "TIPO_III" | null
  situacion_nombre: string | null
  tipo_codigo?: string | null
}

/** Fila de `GET /gestion-estudiantil/observador/opciones/estudiantes`. */
export interface EstudianteObservador {
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string | null
  fk_tgrupo: number
  grado_grupo: string
  fk_tsede: number
  sede_nombre: string | null
  fk_tlv_jornada: number | null
  jornada_nombre: string | null
  fk_testablecimiento: number
}

/** Fila de `GET /gestion-estudiantil/observador/opciones/grupos`. */
export interface GrupoObservador {
  fk_tgrupo: number
  grado_grupo: string
  fk_tgrado: number
  fk_tsede: number
  fk_tlv_jornada: number
}

/** Fila de `GET /gestion-estudiantil/observador/opciones/responsables`. */
export interface ResponsableObservador {
  fk_tfuncionario: number
  nombre: string
}

/** Filtros del listado tal como los guarda la pantalla (ids como texto; vacío = sin filtro). */
export interface ObservadorFiltros {
  establecimiento: string
  sede: string
  jornada: string
  grupo: string
  periodo: string
  tipo: string
  situacion: string
  responsable: string
}

export const FILTROS_VACIOS: ObservadorFiltros = {
  establecimiento: "",
  sede: "",
  jornada: "",
  grupo: "",
  periodo: "",
  tipo: "",
  situacion: "",
  responsable: "",
}

/** `FILTERS` del listado y del export: mismos nombres que los binds de V545.7. */
export interface ObservadorQueryFilters {
  SEARCH: string | null
  FK_ESTABLECIMIENTO: number | null
  FK_SEDE: number | null
  FK_JORNADA: number | null
  FK_GRUPO: number | null
  FK_PERIODO_EVALUACION: number | null
  FK_TLV_TIPO: number | null
  FK_TLV_SITUACION: number | null
  FK_RESPONSABLE: number | null
  FK_MATRICULA: number | null
}

export interface AnotacionCrearInput {
  matriculas: number[]
  fecha: string
  comportamientoId: number
  observacion: string
  preocupaPermanencia: boolean
  requiereMediacion: boolean
}

export interface AnotacionActualizarInput {
  id: number
  fecha: string
  comportamientoId: number
  observacion: string
  preocupaPermanencia: boolean
}

/** VALOR de la Lista de Valores TIPO_OBSERVADOR_FIRMAR (COMPORTAMIENTOS, COMPLETO). */
export type TipoImpresion = string
