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
  /** Resumen de la caracterización familiar (§9.8); solo viaja a quien ve lo sensible. */
  caracterizacion_resumen: CaracterizacionResumen | null
}

/** `fn_prevencion_caracterizacion_resumen`: con `existe: false` solo trae el estado «Sin diligenciar». */
export interface CaracterizacionResumen {
  existe: boolean
  estado: string
  estado_nombre: string
  id?: number
  anio?: number
  fecha_confirmacion?: string | null
  personas_hogar?: number | null
  vive_solo?: boolean | null
  tipo_vivienda?: string | null
  tenencia_vivienda?: string | null
  internet_hogar?: string | null
  equipo_estudiar?: string | null
  trabajo_estudiante?: string | null
  ingresos?: string | null
  revision_factores?: string | null
  factores_vigentes?: string[]
  estrategias_requeridas?: string[]
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

/** Fila de `GET /acceso`: qué pestañas y acciones del módulo ve quien consulta. */
export interface AccesoPrevencion {
  puede_indicadores: boolean
  puede_indicadores_gestion: boolean
  puede_parametros: boolean
  puede_salud_mental: boolean
  puede_reportar_salud_mental: boolean
  /** Pestaña Estrategias (§9.7). */
  puede_estrategias?: boolean
  /** Botón «Nueva estrategia» (solo Supervisor de sede y Administrador). */
  puede_crear_estrategia?: boolean
  /** Pestaña Caracterización familiar y de vivienda (§9.8). */
  puede_caracterizacion?: boolean
  /** Consultar historial académico (§9.8): Supervisor de sede, Orientación, Trabajo social y Administrador. */
  puede_historial_academico?: boolean
}

/** `GET /estudiantes/:MATRICULA/historial` → columna `datos`. */
export interface Historial {
  fk_tmatricula: number
  estudiante_nombre: string
  ve_sensible: boolean
  nivel_actual: { valor: NivelRiesgo; nombre: string; fecha: string } | null
  puede_valorar: boolean
  /** Misma regla del tablero (Regla 40). */
  puede_crear_plan: boolean
  tiene_plan_abierto: boolean
  fk_tprevencion_plan_abierto: number | null
  valoraciones: HistorialValoracion[]
  planes: HistorialPlan[]
  eventos: HistorialEvento[]
  anotaciones_permanencia: HistorialAnotacion[]
  /** Estrategias de las que es o fue beneficiario (§9.7), la más reciente primero. */
  estrategias: HistorialEstrategia[]
}

/** `fn_prevencion_estrategias_estudiante_interno`: `motivo_salida` y `origen_plan` solo en el historial (no en el portal). */
export interface HistorialEstrategia {
  id: number
  nombre: string
  tipo_nombre: string
  fecha_inicio: string
  fecha_fin: string | null
  estado: string
  estado_nombre: string
  fecha_ingreso: string
  fecha_salida: string | null
  resultado_salida_nombre: string | null
  motivo_salida?: string | null
  /** Solo si ve lo sensible: la entró una acción del plan de acompañamiento. */
  origen_plan?: boolean | null
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

// --- Estrategias de permanencia (§9.7) ---

export type EstadoEstrategia = "PLANEADA" | "EN_EJECUCION" | "FINALIZADA"

/** `GET /estrategias`: fecha como timestamp ISO; `beneficiarios` son los activos hoy. */
export interface EstrategiaRow {
  id: number
  nombre: string
  tipo_valor: string
  tipo_nombre: string
  fk_tperiodo_academico: number
  periodo_nombre: string
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  fecha_inicio: string
  fecha_fin: string | null
  fk_tfuncionario_responsable: number
  responsable_nombre: string
  beneficiarios: number | null
  meta: number | null
  estado: EstadoEstrategia
  estado_nombre: string
  puede_modificar: boolean
  puede_agregar_beneficiarios: boolean
  puede_copiar: boolean
  puede_finalizar: boolean
  total_count: number
}

export interface BeneficiarioEstrategia {
  id: number
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fecha_ingreso: string
  fecha_salida: string | null
  resultado_salida_valor: string | null
  resultado_salida_nombre: string | null
  motivo_salida: string | null
  /** Solo si ve lo sensible. */
  origen_plan?: boolean
  puede_retirar: boolean
  /** Estado de la matrícula (`valor` «1» = Cursando). */
  matricula_estado_valor: string | null
  matricula_estado_nombre: string | null
}

export interface EfectividadGrupo {
  siguen_cursando: number
  retirados: number
  tasa_promocion_pct: number | null
  rendimiento_promedio: number | null
}

export interface Efectividad extends EfectividadGrupo {
  beneficiarios: number
  no_beneficiarios: EfectividadGrupo & { estudiantes: number }
}

/** `GET /estrategias/:ID` → columna `datos`. */
export interface EstrategiaDetalle {
  id: number
  nombre: string
  tipo_valor: string
  tipo_nombre: string
  fk_tperiodo_academico: number
  periodo_nombre: string
  fk_tsede: number
  fecha_inicio: string
  fecha_fin: string | null
  fk_tfuncionario_responsable: number
  responsable_nombre: string
  fuente_financiacion: string | null
  meta: number | null
  descripcion: string
  requisitos_ingreso: string | null
  estado: EstadoEstrategia
  estado_nombre: string
  resultado: string | null
  finalizada_en: string | null
  fk_testrategia_origen: number | null
  ve_sensible: boolean
  puede_modificar: boolean
  puede_copiar: boolean
  puede_agregar_beneficiarios: boolean
  puede_finalizar: boolean
  beneficiarios_activos: number
  beneficiarios_total: number
  beneficiarios_copiables: number
  efectividad: Efectividad | null
  beneficiarios: BeneficiarioEstrategia[]
}

/** Lo que los modales de una estrategia necesitan; lo cumplen la fila del listado y el detalle. */
export type ResumenEstrategia = Pick<
  EstrategiaRow,
  "id" | "nombre" | "estado" | "estado_nombre" | "fecha_inicio" | "fecha_fin" | "responsable_nombre"
>

export interface MatriculadoEstrategia {
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  fk_tgrado: number
  grado_nombre: string
  grado_grupo: string
  ya_es_beneficiario: boolean
  /** `EN_EDAD`, `EXTRAEDAD`, `PREEXTRAEDAD`, `SIN_CALCULAR`… */
  situacion_edad: string
  total_count: number
}

export interface GradoEstrategia {
  fk_tgrado: number
  grado_nombre: string
  matriculados: number
}

export interface BeneficiarioAgregado {
  fk_tmatricula: number
  fk_tbeneficiario: number
  estudiante_nombre: string
  situacion_edad: string
  advertencia: string | null
}

export interface EstrategiasFiltros {
  tipo: string
  estado: string
  sede: string
  jornada: string
}

export const ESTRATEGIAS_FILTROS_VACIOS: EstrategiasFiltros = { tipo: "", estado: "", sede: "", jornada: "" }

export interface EstrategiasQueryFilters {
  ESTABLECIMIENTO: number
  SEDE: number | null
  JORNADA: number | null
  TIPO: string | null
  ESTADO: string | null
  SEARCH: string | null
}

/** Cuerpo de crear (con `PERIODO_ACADEMICO`) y de modificar (sin él: es inmutable). */
export interface EstrategiaInput {
  NOMBRE: string
  FK_TIPO: number
  FECHA_INICIO: string
  FECHA_FIN: string | null
  FK_RESPONSABLE: number
  FUENTE_FINANCIACION: string | null
  META: number | null
  DESCRIPCION: string
  REQUISITOS_INGRESO: string | null
}

export interface CrearEstrategiaInput extends EstrategiaInput {
  PERIODO_ACADEMICO: number
}

export interface ModificarEstrategiaInput extends EstrategiaInput {
  id: number
}

export interface CopiarEstrategiaInput {
  id: number
  FECHA_INICIO: string
  FECHA_FIN: string | null
  PERIODO_ACADEMICO: number | null
  CON_BENEFICIARIOS: boolean
}

export interface AgregarBeneficiariosInput {
  id: number
  MATRICULAS: number[]
  FECHA_INGRESO: string
}

export interface RetirarBeneficiarioInput {
  /** Id del beneficiario, no de la estrategia. */
  id: number
  FECHA_SALIDA: string
  FK_RESULTADO: number
  MOTIVO: string | null
}

export interface FinalizarEstrategiaInput {
  id: number
  RESULTADO: string
}

// ---------------------------------------------------------------------------------------------------------------
// Caracterización familiar y de vivienda (§9.8)
// ---------------------------------------------------------------------------------------------------------------

export type EstadoCaracterizacion = "SIN_DILIGENCIAR" | "POR_CONFIRMAR" | "CONFIRMADA"

/** Fila de `GET /caracterizaciones`; `total_count` y `sin_confirmar` viajan en cada fila. */
export interface CaracterizacionRow {
  fk_tmatricula: number
  fk_tprevencion_caracterizacion: number | null
  estudiante_nombre: string
  estudiante_documento: string | null
  fk_tgrupo: number
  grado_grupo: string
  fk_tsede: number
  fk_tlv_jornada: number
  personas_hogar: number | null
  estado: EstadoCaracterizacion
  estado_nombre: string
  fecha_confirmacion: string | null
  confirmada_por: string | null
  puede_modificar: boolean
  sin_confirmar: number
  total_count: number
}

export interface CaracterizacionesFiltros {
  sede: string
  jornada: string
  grupo: string
  estado: string[]
}

export const CARACTERIZACIONES_FILTROS_VACIOS: CaracterizacionesFiltros = { sede: "", jornada: "", grupo: "", estado: [] }

export interface CaracterizacionesQueryFilters {
  ESTABLECIMIENTO: number
  SEDE: number | null
  JORNADA: number | null
  GRUPO: number | null
  ESTADO: string | null
  SEARCH: string | null
}

/** Fila de `GET /opciones/caracterizacion-filtros`: un grupo con estudiantes Cursando. */
export interface OpcionCaracterizacionFiltro {
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
  fk_tgrupo: number
  grado_grupo: string
}

/** Fila de `GET /opciones/caracterizacion`: una opción de lista con su id y su código estable. */
export interface OpcionListaCaracterizacion {
  lista: string
  id: number
  valor: string
  nombre: string
  orden: number
  es_sistema: boolean
}

/** Una opción de lista dentro del detalle. */
export interface ItemLista {
  id: number
  valor: string
  nombre: string
}

export interface IntegranteDetalle {
  id: number | null
  orden: number
  parentesco: ItemLista | null
  nombre: string | null
  edad: number | null
  escolaridad: ItemLista | null
  empleo: ItemLista | null
  vive_con_estudiante: boolean | null
  es_cuidador_principal: boolean | null
  es_acudiente: boolean
  apoyo: string | null
  numero_hijos: number | null
  /** El acudiente de Cobertura cuando ningún integrante lo es: solo lectura y nunca se envía. */
  derivado: boolean
}

export type EstadoFactor = "VIGENTE" | "DESACTIVADO" | "PENDIENTE"

export interface FactorDetalle {
  id: number | null
  factor: ItemLista
  estado: EstadoFactor
  fuente: string | null
  fecha_conocimiento: string | null
  responsable: string | null
  fecha_revision: string | null
  fecha_fin: string | null
  motivo_fin: string | null
}

export interface RevisionHistorial {
  fecha: string
  revision: ItemLista | null
  funcionario: string | null
  factores_vigentes: number
}

export interface AsistenciaCalculada {
  sesiones: number
  justificadas: number
  inasistencias: number
  porcentaje_asistencia: number | null
}

export interface TrayectoriaCalculada {
  repitente: boolean | null
  matricula_anio_anterior: boolean
  anio_anterior: {
    fk_tmatricula: number
    anio: number
    grado_grupo: string | null
    resultado: string | null
    promovido: boolean
    asistencia: AsistenciaCalculada | null
    areas_reprobadas: { periodo: string; areas_evaluadas: number; areas_reprobadas: number } | null
  } | null
  asistencia_anio_actual: AsistenciaCalculada | null
  antecedentes_disciplinarios: {
    anotaciones_negativas: number
    casos_convivencia: number
    casos_tipo_ii_iii: number
    procesos_disciplinarios: number
  } | null
}

/** `GET /caracterizaciones/:MATRICULA` → columna `datos`. Sin fila (`existe: false`) es una vista previa que no se escribe. */
export interface CaracterizacionDetalle {
  fk_tmatricula: number
  existe: boolean
  id: number | null
  anio: number
  estado: EstadoCaracterizacion
  estado_nombre: string
  fecha_confirmacion: string | null
  confirmada_por: string | null
  actualizada_en: string | null
  /** Año de la caracterización de la que se copió (vista previa o fila copiada). */
  copiada_de_anio: number | null
  ve_sensible: boolean
  puede_modificar: boolean
  puede_revisar_factores: boolean
  estudiante: {
    nombre: string
    documento: string | null
    grado_grupo: string
    fk_tgrupo: number
    fk_tsede: number
    fk_tlv_jornada: number
  }
  matricula: {
    direccion: string | null
    estrato: ItemLista | null
    sisben: ItemLista | null
    victima_conflicto: ItemLista | null
    subsidiado: boolean | null
    acudiente: string | null
    acudiente_parentesco: ItemLista | null
  }
  hogar: {
    personas_hogar: number | null
    vive_solo: boolean | null
    estado_civil_padres: ItemLista | null
    motivo_no_vive_padres: string | null
    aportantes_convivientes: number | null
    aportantes_externos: number | null
    ingresos: ItemLista | null
    tipologia_familiar: ItemLista | null
    temas_escuela_padres: string | null
    convivientes_identificados: number
    diferencia_hogar: number | null
    integrantes: IntegranteDetalle[]
  }
  vivienda: {
    tipo_vivienda: ItemLista | null
    tenencia_vivienda: ItemLista | null
    descripcion_otra_vivienda: string | null
    info_servicios: ItemLista | null
    servicios: ItemLista[]
    internet_hogar: ItemLista | null
    internet_estudiar: ItemLista | null
    frecuencia_domicilio: ItemLista | null
  }
  socioeconomica: {
    info_programas: ItemLista | null
    programas: ItemLista[]
    equipo_estudiar: ItemLista | null
  }
  situacion: {
    trabajo_estudiante: ItemLista | null
    padre_temprana_edad: ItemLista | null
    que_desea_estudiar: string | null
    lugar_hermanos: number | null
    proteccion_estado: ItemLista | null
    desempeno_percibido: ItemLista | null
    lugar_estudio: ItemLista | null
    horas_estudio: ItemLista | null
    programas_complementarios: string | null
    medio_transporte: string | null
    tiempo_desplazamiento: number | null
    otra_informacion: string | null
  }
  estrategias_requeridas: ItemLista[]
  trayectoria: {
    declarada: {
      curso_preescolar: ItemLista | null
      anios_preescolar: number | null
      retiros_previos: number | null
      interrupciones_previas: number | null
      meses_fuera_sistema: number | null
      fuente: string | null
      fecha_referencia: string | null
      asistencia_anterior_pct: number | null
      asistencia_anterior_periodo: string | null
      asistencia_anterior_institucion: string | null
      asistencia_anterior_fuente: string | null
      dificultades: ItemLista | null
      dificultades_cuales: string | null
      dificultades_fuente: string | null
      dificultades_fecha: string | null
      causas_repitencia: string | null
    }
    calculada: TrayectoriaCalculada
  }
  establecimiento: {
    asistencia_acudiente: ItemLista | null
    revision_factores: ItemLista | null
    fecha_revision: string | null
    revisada_por: string | null
    observaciones: string | null
    factores: FactorDetalle[]
    historial_revisiones: RevisionHistorial[]
  }
}

/** Cuerpo `BODY.DATOS` de `PUT /caracterizaciones/:MATRICULA` (todo lo que captura el formulario, sin los factores). */
export type DatosCaracterizacion = Record<string, unknown>

export interface GuardarCaracterizacionInput {
  matricula: number
  DATOS: DatosCaracterizacion
}

export interface FactorRevisionInput {
  fk_factor: number
  fuente: string
  fecha_conocimiento: string
}

export interface FactorDesactivarInput {
  fk_factor: number
  motivo: string
}

export interface RevisarFactoresInput {
  matricula: number
  REVISION: number
  FACTORES: FactorRevisionInput[]
  DESACTIVAR: FactorDesactivarInput[]
  OBSERVACIONES: string | null
}

/** Matrícula de un año anterior que ofrece `GET /historial-academico/opciones`. */
export interface HistorialAcademicoMatricula {
  fk_tmatricula: number
  anio: number
  sede: string
  fk_tsede: number
  jornada: string
  modalidad: string | null
  ciclo: string | null
  grado_grupo: string
  estado: string | null
  resultado: string | null
  periodos: { fk_tperiodo_evaluacion: number; nombre: string }[]
  asignaturas: { fk_tasignatura: number; nombre: string; area: string | null }[]
}

/** `GET /estudiantes/:MATRICULA/historial-academico/opciones` → columna `datos`. */
export interface HistorialAcademicoOpciones {
  fk_tmatricula: number
  estudiante_nombre: string
  establecimiento_nombre: string
  grado_grupo: string
  sin_anios_anteriores: boolean
  mensaje: string | null
  anios: number[]
  matriculas: HistorialAcademicoMatricula[]
}

export interface HistorialAcademicoNotaPeriodo {
  fk_tperiodo_evaluacion: number
  periodo: string
  nota: number | null
  nota_texto: string | null
  nota_provisional: number | null
  definitiva: boolean
  valoracion: string | null
  aprobada: boolean | null
  con_recuperacion: boolean
  nota_original: number | null
  valoracion_original: string | null
  sin_registro: boolean
}

export interface HistorialAcademicoAsignatura {
  fk_tasignatura: number
  nombre: string
  area: string | null
  periodos: HistorialAcademicoNotaPeriodo[]
  final: { nota: number | null; valoracion: string | null; aprobada: boolean | null; sin_registro: boolean } | null
}

export interface HistorialAcademicoObservacion {
  fk_tperiodo_evaluacion: number
  periodo: string
  observacion: string | null
  sin_registro: boolean
}

/** `GET /estudiantes/:MATRICULA/historial-academico` → columna `datos`: Evaluativo (`resultados`) o Formativo (`observaciones`). */
export interface HistorialAcademico {
  fk_tmatricula: number
  anio: number
  enfoque: "EVALUATIVO" | "FORMATIVO"
  resultado_matricula: string | null
  resultados: { asignaturas: HistorialAcademicoAsignatura[] } | null
  observaciones: {
    periodos: HistorialAcademicoObservacion[]
    final: { observacion: string | null; sin_registro: boolean } | null
  } | null
}
