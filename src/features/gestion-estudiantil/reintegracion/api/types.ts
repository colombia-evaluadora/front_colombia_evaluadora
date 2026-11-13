import type { CaracterizacionDetalle, Historial } from "@/features/gestion-estudiantil/prevencion/api/types"

// Contrato de la Ruta de Reintegración (V675-V677). Los nombres de columna son los del backend (snake_case);
// los binds de entrada van en MAYÚSCULAS, tal cual los espera query-service.

export type EstadoCaso =
  | "PENDIENTE"
  | "EN_CONTACTO"
  | "DIAGNOSTICO"
  | "INTERVENCION"
  | "REINGRESO_APROBADO"
  | "PERMANENCIA_VERIFICADA"
  | "CERRADO"

export type OrigenCaso = "RETIRO_MATRICULA" | "UMBRAL_REINTEGRACION" | "APERTURA_MANUAL" | "REEVALUACION"

export type DecisionValidacion = "VALIDAR" | "DEVOLVER"

/** Listas que sirve `GET /opciones/listas/:LISTA`. */
export type ListaReintegracion = "ORIGEN" | "MOTIVO_CIERRE" | "TIPO_INTERVENCION" | "RESULTADO_INTERVENCION"

export interface ResultadoEscritura {
  id: number
}

/** Banderas por caso que calcula el backend: la UI deshabilita, no oculta. */
export interface BanderasCaso {
  puede_modificar: boolean
  puede_asignar: boolean
  puede_cambiar_estado: boolean
  puede_validar: boolean
  puede_aprobar_reingreso: boolean
  puede_generar_acta: boolean
  puede_marcar_simpade: boolean
  puede_cerrar: boolean
  puede_registrar_intervencion: boolean
  puede_abrir_convivencia: boolean
  /** Rector, Coordinador, Orientación y el Trabajador social con un caso abierto asignado del estudiante. */
  puede_actualizar_caracterizacion?: boolean
  estados_siguientes: EstadoCaso[]
}

// --- Bandeja ---

export interface CasoRow extends BanderasCaso {
  id: number
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
  origen_valor: OrigenCaso
  origen_nombre: string
  fecha_apertura: string
  fk_tusuario_profesional: number | null
  profesional_nombre: string | null
  estado: EstadoCaso
  estado_etiqueta: string
  pendiente_validacion: boolean
  alta_complejidad: boolean
  dias_en_estado: number
  tiene_retiro: boolean
  total_count: number | string
}

export interface CasosFiltros {
  sede: string
  jornada: string
  estado: string
  /** pk del profesional o `SIN_ASIGNAR`. */
  profesional: string
  origen: string
}

export const CASOS_FILTROS_VACIOS: CasosFiltros = { sede: "", jornada: "", estado: "", profesional: "", origen: "" }

/** Valor del combo Profesional que se traduce a `SIN_ASIGNAR=true`. */
export const PROFESIONAL_SIN_ASIGNAR = "SIN_ASIGNAR"

export interface CasosQueryFilters {
  ESTABLECIMIENTO: number
  SEARCH: string | null
  SEDE: number | null
  JORNADA: number | null
  ESTADO: string | null
  PROFESIONAL: number | null
  SIN_ASIGNAR: boolean
  ORIGEN: string | null
}

// --- Detalle ---

export interface RazonMarcada {
  id: number
  valor: string
  nombre: string
}

export interface RazonesDimension {
  dimension_valor: string
  dimension_nombre: string
  razones: RazonMarcada[]
}

export interface IntervencionRow {
  id: number
  fk_tlv_tipo: number
  tipo_valor: string
  tipo_nombre: string
  fecha_programada: string | null
  fecha_realizacion: string | null
  fk_tlv_resultado: number | null
  resultado_valor: string | null
  resultado_nombre: string | null
  trabajo_realizado: string | null
  fk_tusuario: number
  autor_nombre: string
  pendiente: boolean
  puede_modificar: boolean
  n_evidencias: number | string
  tiene_ficha: boolean
}

export interface CasoAnterior {
  id: number
  estado: EstadoCaso
  estado_etiqueta: string
  fecha_apertura: string
  fecha_cierre: string | null
  motivo_cierre: string | null
  razones: RazonesDimension[]
  intervenciones: IntervencionRow[]
}

export interface DatosMatriculaFicha {
  direccion: string | null
  barrio: string | null
  telefono: string | null
  estrato: string | null
  sisben: string | null
  victima_conflicto: string | null
  subsidio: string | null
  acudiente: { nombre: string | null; parentesco: string | null } | null
}

export interface CasoDetalle {
  id: number
  fk_tmatricula: number
  fk_testudiante: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  sede: string
  fk_tsede: number
  jornada: string
  fk_tlv_jornada: number
  origen: { valor: OrigenCaso; nombre: string }
  motivo_apertura: string | null
  fecha_apertura: string
  estado: EstadoCaso
  estado_etiqueta: string
  fecha_estado: string
  dias_en_estado: number
  pendiente_validacion: boolean
  alta_complejidad: boolean
  profesional: { id: number; nombre: string } | null
  retiro: {
    id: number
    fecha_retiro: string
    motivo_retiro: string | null
    observacion: string | null
    fecha_reintegro: string | null
  } | null
  caso_anterior: CasoAnterior | null
  razones: RazonesDimension[]
  otra_razon: string | null
  causa_principal: { id: number; nombre: string } | null
  motivo_cierre: { valor: string; nombre: string } | null
  fecha_cierre: string | null
  acta: { numero: string; fecha_generacion: string } | null
  simpade: { fecha_ingreso: string; fk_tusuario: number; digitado_por: string } | null
  reingreso: { fecha_reingreso: string | null; aprobado_fecha: string | null; aprobado_por: string | null }
  validaciones: { decision: DecisionValidacion; observacion: string | null; usuario: string; fecha: string }[]
  intervenciones: IntervencionRow[]
  caso_convivencia: { id: number; numero: string } | null
  ficha: {
    datos_matricula: DatosMatriculaFicha
    caracterizacion_disponible: boolean
    /** El JSON de `GET /prevencion/caracterizaciones/:MATRICULA`; null si quien consulta no ve lo sensible. */
    caracterizacion: CaracterizacionDetalle | null
    observaciones_profesional: string | null
  }
  /** Lo devuelve `fn_prevencion_historial_interno`; su forma es la del historial de Prevención. */
  historial_prevencion: Historial
  banderas: BanderasCaso
}

export interface IntervencionDetalle {
  id: number
  fk_treintegracion_caso: number
  tipo: { id: number; valor: string; nombre: string }
  fecha_programada: string | null
  fecha_realizacion: string | null
  pendiente: boolean
  resultado: { id: number; valor: string; nombre: string } | null
  trabajo_realizado: string | null
  comportamiento_casa: string | null
  relacion_familiares: string | null
  estrategias_disciplinarias: string | null
  pruebas_aplicadas: string | null
  compromisos: string | null
  recomendaciones_familia: string | null
  recomendaciones_docente: string | null
  autor: { id: number; nombre: string }
  tiene_ficha: boolean
  evidencias: { id: number; nombre: string; orden: number }[]
}

export interface RemisionRow {
  id: number
  origen: string
  fk_tlv_entidad: number
  entidad_valor: string
  entidad_nombre: string
  fecha_remision: string
  motivo: string
  plazo_dias: number
  fecha_esperada_propuesta: string | null
  fecha_esperada: string | null
  fecha_respuesta: string | null
  respuesta: string | null
  estado: "ENVIADA" | "RESPONDIDA"
  estado_etiqueta: string
  vencida: boolean
  n_gestiones: number | string
  n_ajustes: number | string
  n_recordatorios: number | string
  registrada_por: string
  puede_gestionar: boolean
  soportes: unknown
}

/** Detalle de una remisión externa (común, V669); las claves exactas de `vencimientos` no están fijadas. */
export interface RemisionExternaDetalle {
  fk_tmatricula: number
  fk_origen: number
  estudiante_nombre: string
  grado_grupo: string
  gestiones: { id: number; fecha: string; descripcion: string; registrada_por: string }[]
  ajustes: {
    fecha_anterior: string
    fecha_nueva: string
    motivo: string
    registrado_por: string
    fecha_cambio: string
    fk_gestion: number | null
  }[]
  recordatorios: { id: number; fecha: string; estado: string }[]
  vencimientos: unknown
  fecha_esperada: string | null
  vigente: boolean
  banderas: { puede_responder: boolean; puede_registrar_gestion: boolean; puede_cambiar_recordatorios: boolean }
  [clave: string]: unknown
}

export interface PlazoRemisiones {
  fk_testablecimiento: number
  plazo_seguimiento_dias: number
  es_predeterminado: boolean
  puede_editar: boolean
}

export interface ActaRetiro {
  encabezado: { establecimiento: string; titulo: string; numero: string; fecha_generacion: string }
  novedad: { motivo_novedad: string | null; fecha_retiro: string; motivo_retiro: string | null }
  estudiante: {
    nombre: string
    tipo_documento: string
    documento: string
    sede: string
    jornada: string
    grado: string
    grupo: string
    telefono: string | null
  }
  razones: RazonesDimension[]
  otra_razon: string | null
  observaciones: string | null
  simpade: { fecha_ingreso: string | null; digitado_por: string | null } | null
  firmas: {
    funcionario: string | null
    acudiente: { nombre: string | null; documento: string | null; parentesco: string | null }
    digita_simpade: string | null
  }
}

// --- Opciones ---

export interface OpcionMatricula {
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
}

export interface OpcionProfesional {
  fk_tusuario: number
  nombre: string
}

export interface OpcionLista {
  fk_tlista_valor: number
  valor: string
  nombre: string
  es_sistema: boolean
}

export interface OpcionFuncionario {
  fk_tusuario: number
  fk_tfuncionario: number
  nombre: string
  documento: string
}

export interface OpcionRazon {
  dimension_valor: string
  dimension_nombre: string
  fk_tlv_razon: number
  valor: string
  nombre: string
  es_otra: boolean
}

export interface PermisosReintegracion {
  puede_abrir: boolean
}

// --- Entradas de las mutaciones (los binds van en MAYÚSCULAS) ---

interface RazonesInput {
  RAZONES?: number[] | null
  OTRA_RAZON?: string | null
  FK_CAUSA_PRINCIPAL?: number | null
}

export interface AbrirCasoInput extends RazonesInput {
  MATRICULA: number
  MOTIVO: string
  FK_PROFESIONAL?: number | null
  ALTA_COMPLEJIDAD?: boolean
}

export interface ModificarCasoInput extends RazonesInput {
  id: number
  ALTA_COMPLEJIDAD?: boolean
  OBSERVACIONES?: string | null
}

export interface AsignarCasoInput {
  id: number
  FK_PROFESIONAL: number
}

export interface CambiarEstadoInput extends RazonesInput {
  id: number
  ESTADO: EstadoCaso
}

export interface ValidarCasoInput {
  id: number
  DECISION: DecisionValidacion
  OBSERVACION?: string | null
}

export interface CerrarCasoInput {
  id: number
  FK_MOTIVO?: number | null
}

export interface CerrarCasoResultado {
  id: number
  fk_caso_nuevo: number | null
}

export interface MarcarSimpadeInput {
  id: number
  FECHA: string
  FK_DIGITADO_POR?: number | null
}

export interface IntervencionInput {
  id: number
  FK_TIPO: number
  FECHA_PROGRAMADA?: string | null
  FECHA_REALIZACION?: string | null
  FK_RESULTADO?: number | null
  TRABAJO_REALIZADO?: string | null
  COMPORTAMIENTO_CASA?: string | null
  RELACION_FAMILIARES?: string | null
  ESTRATEGIAS_DISCIPLINARIAS?: string | null
  PRUEBAS_APLICADAS?: string | null
  COMPROMISOS?: string | null
  RECOMENDACIONES_FAMILIA?: string | null
  RECOMENDACIONES_DOCENTE?: string | null
  EVIDENCIAS?: number[]
}

export interface ModificarIntervencionInput extends IntervencionInput {
  intervencion: number
}

export interface RegistrarRemisionInput {
  id: number
  FK_ENTIDAD: number
  MOTIVO: string
  FECHA: string
  FECHA_ESPERADA?: string | null
  MOTIVO_AJUSTE?: string | null
  FECHA_RESPUESTA?: string | null
  RESPUESTA?: string | null
  RECORDATORIOS?: string[]
}

export interface ResponderRemisionInput {
  id: number
  FECHA_RESPUESTA: string
  RESPUESTA: string
  SOPORTES?: number[]
}

export interface GestionRemisionInput {
  id: number
  FECHA: string
  DESCRIPCION: string
  NUEVA_FECHA?: string | null
  MOTIVO_AJUSTE?: string | null
}

export interface RecordatoriosRemisionInput {
  id: number
  FECHAS: string[]
}
