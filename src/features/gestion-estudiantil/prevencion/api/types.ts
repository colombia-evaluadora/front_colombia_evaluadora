// Contrato de V638-V650 (SSO), Prevención y retención. Las filas llegan en snake_case tal como las
// devuelven las funciones `fn_prevencion_*`; los cuerpos de escritura y los parámetros de consulta van en
// MAYÚSCULAS. Las fechas son `aaaa-mm-dd` (DATE) salvo las marcas de tiempo de auditoría.

export type NivelRiesgo = "BAJO" | "MEDIO" | "ALTO"

export type SenalRiesgo =
  | "INASISTENCIA"
  | "RENDIMIENTO_ACADEMICO"
  | "CONVIVENCIA"
  | "REPORTE_DOCENTE"
  | "ANOTACIONES_NEGATIVAS"
  | "COMPROMISOS_INCUMPLIDOS"
  | "EXTRAEDAD"
  | "RIESGO_EXTRAEDAD"
  | "FACTORES_VULNERABILIDAD"
  | "CONDICIONES_MATRICULA"
  | "SALUD_MENTAL"

export type EstadoPlan =
  | "PROPUESTO"
  | "ACTIVO"
  | "EN_SEGUIMIENTO"
  | "SUPERADO"
  | "INCUMPLIDO"
  | "CERRADO_MATRICULA"
  | "ANULADO"

export type EstadoAccion = "PENDIENTE" | "VENCIDA" | "CUMPLIDA"

export type SeveridadSaludMental = "VITAL" | "CRITICO" | "SEGUIMIENTO" | "POR_VALORAR"

/** Fila de `GET /tablero` (`total_count` se repite en cada fila). Nivel y plan pueden venir null (Regla 1). */
export interface TableroRow {
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  fk_tgrupo: number
  grado_grupo: string
  fk_tsede: number
  /** Códigos redactados según lo que el usuario ve. */
  senales: SenalRiesgo[]
  condiciones: string[]
  nivel_riesgo_valor: NivelRiesgo | null
  nivel_riesgo_nombre: string | null
  fk_tprevencion_plan: number | null
  estado_plan: EstadoPlan | null
  puede_valorar: boolean
  puede_crear_plan: boolean
  /** Sin asistencia registrada. */
  faltan_datos: boolean
  severidad_salud_mental: SeveridadSaludMental | null
  fk_gestion_alerta: number | null
  /** Sin backend hasta 9.11: siempre false. */
  puede_gestionar: boolean
  total_count: number
}

/** Fila de `GET /valoraciones`: una valoración (tipo VALORACION) o un plan sin valoración visible (tipo PLAN). */
export interface ValoracionRow {
  id: number
  tipo: "VALORACION" | "PLAN"
  fecha: string
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  nivel_riesgo_valor: NivelRiesgo | null
  nivel_riesgo_nombre: string | null
  fk_tprevencion_plan: number | null
  estado_plan: EstadoPlan | null
  acciones_vencidas: number | null
  anulada: boolean
  puede_registrar_avance: boolean
  puede_marcar: boolean
  puede_aceptar_presencial: boolean
  puede_anular: boolean
  puede_anular_valoracion: boolean
  total_count: number
}

export interface Anulacion {
  fecha: string
  motivo: string
  por: string
}

/** `GET /valoraciones/:ID` → columna `datos`. */
export interface ValoracionDetalle {
  id: number
  fk_tmatricula: number
  estudiante_nombre: string
  grado_grupo: string
  fecha: string
  fk_tlv_nivel: number
  nivel_valor: NivelRiesgo
  nivel_nombre: string
  analisis: string
  /** Señales y condiciones vigentes al valorar (JSONB tal cual lo guardó el backend). */
  alertas_consideradas: unknown
  valorada_por: string
  anulada: boolean
  anulacion: Anulacion | null
  fk_tprevencion_plan: number | null
  /** Resumen de la caracterización (puede ser null). */
  caracterizacion_resumen: unknown
}

export interface AvanceAccion {
  id: number
  fecha: string
  descripcion: string
  cumplida: boolean
  registrado_por: string
}

export interface AccionPlan {
  id: number
  tipo_valor: string
  tipo_nombre: string
  descripcion: string
  fk_responsable: number
  responsable_nombre: string
  plazo: string
  estado: EstadoAccion
  cumplida_en: string | null
  fk_tcitacion: number | null
  fk_estrategia: number | null
  estrategia_nombre: string | null
  es_responsable: boolean
  puede_registrar_avance: boolean
  avances: AvanceAccion[]
}

/** `GET /planes/:ID` → columna `datos`. */
export interface PlanDetalle {
  id: number
  fk_tmatricula: number
  puede_marcar: boolean
  puede_modificar: boolean
  puede_aceptar_presencial: boolean
  puede_anular: boolean
  acudiente: { nombre: string; parentesco: string | null } | null
  estudiante_nombre: string
  grado_grupo: string
  estado: EstadoPlan
  objetivo: string
  fecha_inicio: string
  fecha_fin_prevista: string
  fecha_aceptacion: string | null
  aceptacion_presencial: boolean | null
  canal_aceptacion: string | null
  fk_tarchivo_soporte: number | null
  caso_convivencia: { id: number; numero: string; estado: string } | null
  creado_por: string
  fk_tprevencion_valoracion: number | null
  ve_sensible: boolean
  valoracion: { fecha: string; nivel_valor: NivelRiesgo; nivel_nombre: string } | null
  anulacion: Anulacion | null
  acciones: AccionPlan[]
}

/** `GET /planes/:ID/soporte`: sin fila si no hay soporte. */
export interface PlanSoporte {
  pk_tarchivo: number
  nombre: string
  fecha_aceptacion: string
}

export interface HistorialValoracion {
  id: number
  fecha: string
  nivel_valor: NivelRiesgo | null
  nivel_nombre: string | null
  analisis: string | null
  valorada_por: string
  anulada: boolean
}

export interface HistorialPlan {
  id: number
  objetivo: string
  fecha_creacion: string
  fecha_inicio: string
  fecha_fin_prevista: string
  fecha_aceptacion: string | null
  canal_aceptacion: string | null
  fk_tcaso_convivencia: number | null
  estado: EstadoPlan
  acciones_total: number
  acciones_cumplidas: number
}

export interface HistorialEvento {
  fecha: string
  /** VALORACION, PLAN_CREADO, PLAN_ACEPTADO, AVANCE, ACCION_CUMPLIDA, ACCION_VENCIDA, PLAN_ANULADO, ... */
  tipo: string
  texto: string
  fk_tprevencion_plan: number | null
  autor: string | null
  /** Etiqueta del nivel («Medio»), no el código. */
  nivel: string | null
}

export interface HistorialAnotacion {
  fecha: string
  codigo: string
  autor: string | null
}

/** `GET /estudiantes/:MATRICULA/historial` → columna `datos`. */
export interface Historial {
  fk_tmatricula: number
  estudiante_nombre: string
  ve_sensible: boolean
  nivel_actual: { valor: NivelRiesgo; nombre: string; fecha: string } | null
  puede_valorar: boolean
  tiene_plan_abierto: boolean
  fk_tprevencion_plan_abierto: number | null
  valoraciones: HistorialValoracion[]
  planes: HistorialPlan[]
  eventos: HistorialEvento[]
  anotaciones_permanencia: HistorialAnotacion[]
  /** Estrategias del estudiante (fase posterior). */
  estrategias: unknown
}

/** Fila de `GET /estudiantes/:MATRICULA/alertas`. */
export interface AlertasEstudiante {
  fk_tmatricula: number
  senales: SenalRiesgo[]
  condiciones: string[]
  faltan_datos: boolean
  ve_sensible: boolean
}

/** Fila de `GET /parametros`. */
export interface ParametrosRiesgo {
  fk_testablecimiento: number
  inasist_consec_alerta: number
  caida_ra_alerta: number | null
  caida_ra_referencia: number | null
  areas_reprobadas_alerta: number
  inasist_consec_intervencion: number
  inasist_consec_reintegracion: number
  inasist_alternadas_reintegracion: number
  plazo_incumplimiento_semanas: number
  plazo_contacto_dias: number
  plazo_intervencion_dias: number
  anotaciones_negativas_alerta: number
  compromisos_incumplidos_alerta: number
  condiciones_alerta: string[]
  es_predeterminado: boolean
}

/** Fila de `GET /indicadores` (RESUMEN, y una por grupo del agrupamiento pedido). */
export interface IndicadorRow {
  tipo: string
  clave: string | null
  etiqueta: string | null
  cursando: number
  asistencia_pct: number | null
  injustificada_pct: number | null
  reprobacion_pct: number | null
  en_riesgo: number
  en_riesgo_pct: number | null
  retenidos: number
  retenidos_base: number
  retiros: number
  motivo_principal: string | null
  fk_tperiodo_academico: number | null
  periodo_academico_nombre: string | null
  fk_tperiodo_evaluacion: number | null
  periodo_nombre: string | null
}

/** Fila de `GET /indicadores/gestion` (IE-01; 403 fuera de Rector y Coordinador). */
export interface IndicadorGestionRow {
  nivel: "ESTABLECIMIENTO" | "SEDE"
  fk_testablecimiento: number
  establecimiento_nombre: string
  fk_tsede: number | null
  sede_nombre: string | null
  esperadas: number
  a_tiempo: number
  porcentaje: number | null
  meta: number
  cumple: boolean | null
  ie02: string
  sed01: string
}

// Opciones de selectores.

export interface OpcionEstudiante {
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fk_tgrupo: number
}

export interface OpcionEstrategia {
  fk_testrategia: number
  nombre: string
  tipo_nombre: string
  fecha_inicio: string
  fecha_fin: string
  ya_es_beneficiario: boolean
}

export interface OpcionResponsable {
  fk_tfuncionario: number
  nombre: string
  es_usuario_actual: boolean
}

export interface OpcionGrupo {
  fk_tgrupo: number
  grado_grupo: string
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
}

export interface OpcionPeriodo {
  fk_tperiodo_evaluacion: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  fk_tsede: number
  es_vigente: boolean
}

export interface OpcionPeriodoAcademico {
  fk_tperiodo_academico: number
  nombre: string
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
  fecha_inicio: string
  fecha_fin: string
  es_vigente: boolean
}

export interface OpcionMotivoRetiro {
  valor: string
  nombre: string
}

export interface OpcionSedeJornada {
  fk_testablecimiento: number
  establecimiento_nombre: string
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
}

// Filtros de la UI (valores de combo como texto; "" = sin filtro).

export interface TableroFiltros {
  periodo: string
  senal: string
  nivel: string
  sede: string
  jornada: string
  grupo: string
}

export const TABLERO_FILTROS_VACIOS: TableroFiltros = {
  periodo: "",
  senal: "",
  nivel: "",
  sede: "",
  jornada: "",
  grupo: "",
}

/** Parámetros de `GET /tablero` (query-string en MAYÚSCULAS exactas). */
export interface TableroQueryFilters {
  ESTABLECIMIENTO: number
  PERIODO: number | null
  SENAL: string | null
  NIVEL: string | null
  GRUPO: number | null
  SEDE: number | null
  JORNADA: number | null
  SEARCH: string | null
}

export interface ValoracionesFiltros {
  nivel: string
  estado: string
  sede: string
  jornada: string
  anuladas: string
}

export const VALORACIONES_FILTROS_VACIOS: ValoracionesFiltros = {
  nivel: "",
  estado: "",
  sede: "",
  jornada: "",
  anuladas: "",
}

export interface ValoracionesQueryFilters {
  ESTABLECIMIENTO: number
  NIVEL: string | null
  ESTADO: string | null
  SEARCH: string | null
  SEDE: number | null
  JORNADA: number | null
  ANULADAS: boolean
}

export interface IndicadoresFiltros {
  periodoAcademico: string
  periodo: string
  sede: string
  jornada: string
  agrupar: string
  motivoRetiro: string
}

export const INDICADORES_FILTROS_VACIOS: IndicadoresFiltros = {
  periodoAcademico: "",
  periodo: "",
  sede: "",
  jornada: "",
  agrupar: "GRADO",
  motivoRetiro: "",
}

export interface IndicadoresQueryFilters {
  ESTABLECIMIENTO: number
  PERIODO_ACADEMICO: number | null
  PERIODO: number | null
  SEDE: number | null
  JORNADA: number | null
  AGRUPAR: string | null
  MOTIVO_RETIRO: string | null
}

// Cuerpos de escritura (`:BODY.X`). Las fechas viajan `aaaa-mm-dd`.

export interface CrearValoracionInput {
  MATRICULA: number
  FECHA: string
  /** pk de `NIVEL_RIESGO`. */
  FK_NIVEL: number
  ANALISIS: string
}

export interface AnularInput {
  id: number
  MOTIVO: string
}

/** Acción del plan en el JSONB `ACCIONES`: las claves internas van en minúscula (V642 lee `a->>'fk_tipo'`). */
export interface AccionPlanInput {
  /** pk de `TIPO_ACCION_PREVENTIVA`. */
  fk_tipo: number
  descripcion: string
  fk_responsable: number
  /** `aaaa-mm-dd`. */
  plazo: string
  /** Estrategia de permanencia (9.7, fase posterior). */
  fk_estrategia?: number | null
}

export interface CrearPlanInput {
  MATRICULA: number
  FK_VALORACION?: number | null
  OBJETIVO: string
  FECHA_INICIO: string
  FECHA_FIN: string
  ACCIONES: AccionPlanInput[]
}

export interface ModificarPlanInput {
  id: number
  OBJETIVO: string
  FECHA_INICIO: string
  FECHA_FIN: string
  ACCIONES: AccionPlanInput[]
}

export interface AceptacionPresencialInput {
  id: number
  FECHA: string
  FK_SOPORTE: number
}

export interface MarcarPlanInput {
  id: number
  ESTADO: "SUPERADO" | "INCUMPLIDO"
}

export interface RegistrarAvanceInput {
  /** pk de la acción. */
  id: number
  FECHA: string
  DESCRIPCION: string
  CUMPLIDA?: boolean
}

export interface GuardarParametrosInput {
  ESTABLECIMIENTO: number
  INASIST_CONSEC_ALERTA: number
  CAIDA_RA_ALERTA: number | null
  AREAS_REPROBADAS_ALERTA: number
  INASIST_CONSEC_INTERVENCION: number
  INASIST_CONSEC_REINTEGRACION: number
  INASIST_ALTERNADAS_REINTEGRACION: number
  PLAZO_INCUMPLIMIENTO_SEMANAS: number
  PLAZO_CONTACTO_DIAS: number
  PLAZO_INTERVENCION_DIAS: number
  ANOTACIONES_NEGATIVAS_ALERTA: number
  COMPROMISOS_INCUMPLIDOS_ALERTA: number
  CONDICIONES_ALERTA: string[]
}

/** Respuesta de las escrituras: la pk del objeto escrito. */
export interface ResultadoEscritura {
  id: number
}

// --- Salud mental (§9.6) ---

export type EstadoSenalSM = "POR_VALORAR" | "VALORADA" | "EN_ATENCION" | "REMITIDA" | "CERRADA"

export interface SenalSMRow {
  id: number
  fecha: string
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fk_tsede: number
  tipo_valor: string
  tipo_nombre: string
  severidad_valor: SeveridadSaludMental | null
  severidad_nombre: string | null
  estado: EstadoSenalSM
  estado_nombre: string
  es_propia: boolean
  puede_valorar: boolean
  puede_atender: boolean
  puede_cerrar: boolean
  es_orientacion: boolean
  total_count: number
}

export interface SenalSMValoracion {
  id: number
  fecha: string
  notas: string
  valorada_por: string
  severidad_valor: SeveridadSaludMental
  severidad_nombre: string
}

export interface SenalSMAtencion {
  id: number
  fecha: string
  accion: string
  entidad_valor: string | null
  entidad_nombre: string | null
  registrada_por: string
}

export interface SenalSMDetalle {
  id: number
  fecha: string
  estado: EstadoSenalSM
  estado_nombre: string
  origen: string
  tipo_valor: string
  tipo_nombre: string
  grado_grupo: string
  fk_tmatricula: number
  estudiante_nombre: string
  reportada_por: string
  lo_observado: string
  /** false: quien la reportó sin acceso sensible solo ve su reporte y su estado. */
  ve_sensible: boolean
  es_orientacion: boolean
  puede_valorar: boolean
  puede_atender: boolean
  puede_cerrar: boolean
  severidad_valor: SeveridadSaludMental | null
  severidad_nombre: string | null
  valorada_por: string | null
  fecha_valoracion: string | null
  notas_valoracion: string | null
  valoraciones: SenalSMValoracion[]
  atenciones: SenalSMAtencion[]
  cerrada_en: string | null
  cerrada_por: string | null
  fk_tcitacion: number | null
}

export interface SaludMentalFiltros {
  severidad: string
  estado: string
  sede: string
  jornada: string
}

export const SALUD_MENTAL_FILTROS_VACIOS: SaludMentalFiltros = { severidad: "", estado: "", sede: "", jornada: "" }

export interface SaludMentalQueryFilters {
  ESTABLECIMIENTO: number
  SEVERIDAD: string | null
  ESTADO: string | null
  SEDE: number | null
  JORNADA: number | null
  SEARCH: string | null
}

export interface ReportarSenalInput {
  MATRICULA: number
  FECHA: string
  FK_TIPO: number
  LO_OBSERVADO: string
}

export interface ValorarSenalInput {
  id: number
  FK_SEVERIDAD: number
  NOTAS: string
}

export interface AtencionSenalInput {
  id: number
  ACCION: string
  FK_ENTIDAD: number | null
  FECHA: string
}

/** Lo que los modales de una señal necesitan para su resumen; lo cumplen la fila del listado y el detalle. */
export type ResumenSenalSM = Pick<
  SenalSMRow,
  "id" | "fecha" | "estudiante_nombre" | "tipo_nombre" | "severidad_valor" | "severidad_nombre" | "estado" | "estado_nombre"
>
