/** Fila de `POST /gestion-estudiantil/convivencia/casos/query` (fn_convivencia_caso_listar, V599). */
export interface CasoRow {
  id: number
  numero: string | number
  fk_establecimiento: number
  fecha_hechos_conocida: boolean
  fecha_hechos: string | null
  hora_hechos_conocida: boolean | null
  hora_hechos: string | null
  fecha_conocimiento: string
  fk_tlv_tipo: number
  tipo_codigo: TipoSituacionCodigo | null
  tipo_nombre: string
  fk_tlv_manifestacion: number | null
  manifestacion_nombre: string | null
  estudiantes: number
  fk_tfuncionario_gestor: number | null
  gestor_nombre: string | null
  estado_codigo: EstadoCasoCodigo
  estado_nombre: string
  pasos_pendientes: number | null
  ultimo_seguimiento: string | null
  afectados_pendientes_siuce: number | null
  confidencial: boolean
  es_propio: boolean
  total_count?: number
}

export type TipoSituacionCodigo = "TIPO_I" | "TIPO_II" | "TIPO_III"
export type EstadoCasoCodigo = "REPORTADO" | "EN_ATENCION" | "REMITIDO" | "EN_SEGUIMIENTO" | "CERRADO" | "ANULADO"

export interface CasoEstudiante {
  id: number
  fk_matricula: number
  nombre: string
  grado_grupo: string | null
  fk_tlv_rol: number
  rol_nombre: string | null
}

export interface CasoInvolucrado {
  id: number
  fk_tlv_tipo_involucrado: number
  tipo_nombre: string | null
  fk_funcionario: number | null
  nombre: string | null
  fk_tlv_tipo_documento: number | null
  numero_documento: string | null
  fk_tlv_rol: number
  rol_nombre: string | null
}

export interface CasoAccion {
  id: number
  fk_tlv_accion: number
  accion_codigo: string
  accion_nombre: string
  fecha_hora: string
  fk_funcionario_responsable: number | null
  responsable_nombre: string | null
  descripcion: string
  fk_tlv_entidad: number | null
  no_aplica: boolean
  fk_tlv_resultado: number | null
  resultado_nombre: string | null
  soportes: { fk_archivo: number; vinculado: boolean }[]
  codigos_siuce: { fk_matricula: number | null; fk_funcionario: number | null; codigo: string }[]
}

/**
 * `GET /gestion-estudiantil/convivencia/casos/:ID` (fn_convivencia_caso_detalle_interno, V267).
 * Con `acceso_completo=false` en un Tipo II/III solo llegan número, tipo, estado y fecha de conocimiento.
 */
export interface CasoDetalle {
  id: number
  numero: string | number
  fk_tlv_tipo: number
  tipo_codigo: TipoSituacionCodigo | null
  tipo_nombre: string
  estado_codigo: EstadoCasoCodigo
  estado_nombre: string
  fecha_conocimiento: string
  acceso_completo: boolean
  fk_establecimiento?: number
  fk_tlv_manifestacion?: number
  fecha_hechos_conocida?: boolean
  fecha_hechos?: string | null
  hora_hechos_conocida?: boolean | null
  hora_hechos?: string | null
  fk_tlv_lugar?: number
  descripcion?: string
  tipos_dano?: number[]
  fk_tlv_tipo_agresion?: number | null
  fk_tlv_evento_generador?: number | null
  situacion_repetitiva?: boolean | null
  secuelas_fisicas?: boolean | null
  fk_tarchivo_soporte?: number | null
  fk_funcionario_reporta?: number | null
  reporta_nombre?: string | null
  fk_funcionario_gestor?: number | null
  gestor_nombre?: string | null
  anotaciones_origen?: number[]
  estudiantes?: CasoEstudiante[]
  otros_involucrados?: CasoInvolucrado[] | null
  acciones?: CasoAccion[] | null
  ultimo_seguimiento?: string | null
  cierre?: { resumen: string; cerrado_en: string; cerrado_por: string | null } | null
  anulacion?: { anulado_en: string; motivo: string; anulado_por: string | null } | null
}

/** Fila de `GET /casos/:ID/pasos` (fn_convivencia_caso_pasos_listar). */
export interface PasoCaso {
  accion: string
  accion_nombre: string
  orden: number
  condicional: boolean
  registrado: boolean
  no_aplica: boolean
  de_cierre: boolean
}

/** Fila de `GET /casos/:ID/gestores`: supervisores candidatos del caso. */
export interface GestorCandidato {
  fk_tfuncionario: number
  nombre: string
  es_reportante: boolean
  es_actual: boolean
}

/** Fila de `POST /gestor-previsto`: a quién se asignará el caso al crearlo. */
export interface GestorPrevisto {
  fk_tfuncionario: number | null
  nombre: string | null
  sin_gestor: boolean
}

/** Filtros del listado tal como los guarda la pantalla (ids como texto; vacío = sin filtro). */
export interface ConvivenciaFiltros {
  sede: string
  jornada: string
  tipo: string
  estado: string
  /** Id de funcionario, o `SIN_GESTOR`. */
  gestor: string
  pendienteSiuce: string
}

export const SIN_GESTOR = "SIN_GESTOR"

export const FILTROS_VACIOS: ConvivenciaFiltros = {
  sede: "",
  jornada: "",
  tipo: "",
  estado: "",
  gestor: "",
  pendienteSiuce: "",
}

/** `FILTERS` del listado: mismos nombres que los binds de V599. */
export interface ConvivenciaQueryFilters {
  SEARCH: string | null
  FK_SEDE: number | null
  FK_JORNADA: number | null
  FK_TLV_TIPO: number | null
  FK_TLV_ESTADO: number | null
  FK_GESTOR: number | null
  SIN_GESTOR: boolean | null
  PENDIENTE_SIUCE: boolean | null
}

/** Datos del caso comunes a crear y a modificar (cuerpo de `POST /casos` y `PUT /casos/:ID`). */
export interface CasoDatosInput {
  FK_TLV_MANIFESTACION: number
  FECHA_HECHOS_CONOCIDA: boolean
  FECHA_HECHOS: string | null
  HORA_HECHOS_CONOCIDA: boolean | null
  HORA_HECHOS: string | null
  FECHA_CONOCIMIENTO: string
  FK_TLV_LUGAR: number
  DESCRIPCION: string
  TIPOS_DANO: number[] | null
  FK_TLV_TIPO_AGRESION: number | null
  FK_TLV_EVENTO_GENERADOR: number | null
  SITUACION_REPETITIVA: boolean | null
  SECUELAS_FISICAS: boolean | null
  FK_ARCHIVO_SOPORTE: number | null
}

export interface EstudianteInput {
  fk_matricula: number
  fk_tlv_rol: number
}

export interface InvolucradoInput {
  fk_tlv_tipo_involucrado: number
  fk_funcionario: number | null
  nombre: string
  fk_tlv_tipo_documento: number | null
  numero_documento: string | null
  fk_tlv_rol: number
}

export interface AccionInput {
  casoId: number
  FK_TLV_ACCION: number
  FECHA: string
  HORA: string
  DESCRIPCION: string
  FK_TLV_ENTIDAD: number | null
  NO_APLICA: boolean
  FK_TLV_RESULTADO: number | null
  FK_ARCHIVOS: number[] | null
  CODIGOS_SIUCE: { fk_matricula: number | null; fk_funcionario: number | null; codigo: string }[] | null
}

/** Lo que muestran y necesitan los diálogos de operación: sale igual de una fila o del detalle. */
export interface CasoResumen {
  id: number
  numero: string | number
  tipo_codigo: TipoSituacionCodigo | null
  tipo_nombre: string
  fk_tlv_tipo: number
  estado_codigo: EstadoCasoCodigo
  estado_nombre: string
  fk_gestor: number | null
  gestor_nombre: string | null
}

export const resumenDeFila = (r: CasoRow): CasoResumen => ({
  id: r.id,
  numero: r.numero,
  tipo_codigo: r.tipo_codigo,
  tipo_nombre: r.tipo_nombre,
  fk_tlv_tipo: r.fk_tlv_tipo,
  estado_codigo: r.estado_codigo,
  estado_nombre: r.estado_nombre,
  fk_gestor: r.fk_tfuncionario_gestor,
  gestor_nombre: r.gestor_nombre,
})

export const resumenDeDetalle = (d: CasoDetalle): CasoResumen => ({
  id: d.id,
  numero: d.numero,
  tipo_codigo: d.tipo_codigo,
  tipo_nombre: d.tipo_nombre,
  fk_tlv_tipo: d.fk_tlv_tipo,
  estado_codigo: d.estado_codigo,
  estado_nombre: d.estado_nombre,
  fk_gestor: d.fk_funcionario_gestor ?? null,
  gestor_nombre: d.gestor_nombre ?? null,
})
