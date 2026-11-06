export type EstadoPiar = "BORRADOR" | "VIGENTE" | "REVISION_CONCLUIDA" | "CERRADO"

export interface PiarFiltros {
  sede: string
  jornada: string
  grupo: string
  estado: string
  condicion: string
  pendientes: string
}

export const FILTROS_VACIOS: PiarFiltros = { sede: "", jornada: "", grupo: "", estado: "", condicion: "", pendientes: "" }

/** Fila de `fn_piar_listar_interno` (V601). */
export interface PiarRow {
  id: number
  fk_tmatricula: number
  estudiante_nombre: string
  documento: string | null
  grado_grupo: string
  sede_nombre: string | null
  jornada_nombre: string | null
  condicion: string | null
  estado_codigo: EstadoPiar
  estado_nombre: string
  fecha_elaboracion: string
  ajustes: number
  por_mapear: number
  seguimientos_pendientes: number
  trasladado: boolean
  total_count: number
}

/** Fila de `fn_piar_aviso_sin_piar` (Regla 28). */
export interface SinPiarRow {
  fk_tmatricula: number
  estudiante_nombre: string
  grado_grupo: string
  condicion: string | null
  fecha_limite: string | null
  vencido: boolean
  tiene_borrador: boolean
}

export interface ArchivoRef {
  id: number
  nombre: string
}

export interface Seguimiento {
  id: number
  fk_tperiodo_evaluacion: number
  periodo_nombre: string
  avance: string
  registra: string | null
  fecha: string
}

export interface Evidencia {
  id: number
  fecha: string
  descripcion: string
  archivos: ArchivoRef[]
}

export interface Ajuste {
  id: number
  fk_tasignatura: number | null
  asignatura_nombre: string | null
  transversal: boolean
  por_mapear: boolean
  asignatura_origen: string | null
  tipo_ajuste: { id: number; nombre: string }
  tipo_barrera: { id: number; nombre: string } | null
  tipo_adaptacion: { id: number; nombre: string }
  especificacion: string | null
  barrera_concreta: string | null
  meta: string
  ajuste: string
  recursos: string | null
  apoyos_requeridos: string | null
  productos_apoyo: string | null
  seguimientos: Seguimiento[]
  /** Solo con acceso sensible: el docente no las recibe. */
  evidencias?: Evidencia[]
}

export interface Cobertura {
  fk_tasignatura: number
  asignatura_nombre: string
  cobertura: "PENDIENTE_REVISION" | "CON_AJUSTES" | "SIN_AJUSTES"
  cobertura_nombre: string
  justificacion: string | null
  revisado_en: string | null
  revisado_por: string | null
}

export interface Participante {
  id: number
  tipo_persona: string
  nombre: string | null
  calidad: { id: number; codigo: string; nombre: string }
  otra_calidad: string | null
  compromisos: string | null
  debe_firmar: boolean
  estado_firma: string | null
}

export interface VersionActual {
  id: number
  numero: string
  estado: { codigo: string; nombre: string }
  fecha_acuerdo: string | null
  compromisos_establecimiento: string | null
  compromisos_familia: string | null
  acta: ArchivoRef | null
  acordada_en: string | null
  copia: { fecha: string; medio: string; registra: string | null } | null
  firmantes_faltantes: string[] | null
  participantes: Participante[]
}

export interface ActividadFamiliar {
  id: number
  actividad: string
  descripcion: string
  frecuencia: string
  responsable: string
  fecha_revision: string
  resultado: string | null
  fecha_resultado: string | null
  fuente_resultado: string | null
}

/** Expediente de `fn_piar_detalle_interno`: sin `ve_sensible` solo llegan cabecera y ajustes (Regla 1). */
export interface PiarDetalle {
  id: number
  estado: { id: number; codigo: EstadoPiar; nombre: string }
  estudiante: { fk_tmatricula: number; fk_testudiante: number; nombre: string; grado_grupo: string }
  fecha_elaboracion: string
  elabora: { id: number; nombre: string } | null
  activado_en: string | null
  fk_tpiar_origen: number | null
  cierre: { motivo: string; cerrado_en: string; informe_anual: string | null } | null
  anulacion: { anulada: boolean; anulado_en?: string; motivo?: string; anula?: string } | null
  ve_sensible: boolean
  condicion: string | null
  periodo_academico: string | null
  ajustes: Ajuste[]
  datos_existentes?: { identificacion: string | null; sede: string | null; jornada: string | null; convive_acudiente: string | boolean | null; fecha_ingreso: string | null; repitente: string | boolean | null; nuevo: string | boolean | null }
  conclusion?: { sintesis: string; recomendaciones: string; fecha_conclusion: string; fecha_proxima_revision: string; responsable: string | null } | null
  justificacion_condicion?: string | null
  voz?: {
    gustos_intereses: string | null
    expectativas_estudiante: string | null
    fuente_expectativas_estudiante: string | null
    expectativas_familia: string | null
    fuente_expectativas_familia: string | null
  }
  caracterizacion?: { fortalezas: string | null; barreras: string | null; apoyos_utiles: string | null; productos_apoyo: string | null }
  valoracion_pedagogica?: string | null
  redes_apoyo?: { id: number; tipo_integrante: { id: number; nombre: string }; persona_institucion: string | null; relacion: string | null; apoyo: string | null }[]
  informes_profesionales?: { id: number; fk_tarchivo: number; nombre: string; orden: number }[]
  antecedentes?: { id: number; necesidad: string; fecha: string; fuente: string; descripcion: string; apoyo_jornada: string | null; responsable: { id: number; nombre: string } }[]
  documentos_externos?: { id: number; tipo: { id: number; nombre: string }; institucion: string; fecha_documento: string; fecha_recepcion: string; archivo: ArchivoRef }[]
  cobertura?: Cobertura[]
  actividades_familiares?: ActividadFamiliar[]
  activacion_faltantes?: string[] | null
  acudiente?: { fk_tpadre: number; nombre: string; tiene_cuenta: boolean } | null
  version_actual?: VersionActual | null
}

export interface Actualizacion {
  id: number
  tipo_cambio: string
  tipo_cambio_nombre: string
  que_cambio: string
  por_que: string
  aplica_desde: string
  valores_anteriores: Record<string, unknown>
  valores_nuevos: Record<string, unknown>
  fk_tarchivo_soporte: number | null
  soporte_nombre: string | null
  registrado_en: string
  registra: string | null
}

export interface VersionHistorial {
  id: number
  numero: string
  estado: { codigo: string; nombre: string }
  fecha_acuerdo: string | null
  acordada_en: string | null
  fk_tarchivo_acta: number | null
  creada_en: string
  acta_nombre: string | null
  autor: string | null
  conclusion: { sintesis: string; recomendaciones: string; fecha_conclusion: string; fecha_proxima_revision: string; responsable: string | null } | null
  actualizaciones: Actualizacion[]
}

/** El docente recibe `ajustes`; los roles de la Regla 1, `versiones`. */
export interface PiarHistorial {
  versiones?: VersionHistorial[]
  ajustes?: { id: number; asignatura_nombre: string; ajuste: string; creado_en: string; quitado_en: string | null; seguimientos: { periodo_nombre: string; avance: string; fecha: string }[] }[]
}

export interface MatriculaDisponible {
  fk_tmatricula: number
  estudiante_nombre: string
  documento: string | null
  grado_grupo: string
  condicion: string | null
  tiene_condicion: boolean
}

export interface AsignaturaOpcion {
  fk_tasignatura: number
  nombre: string
  cobertura: string
  cobertura_nombre: string
  ajustes: number
}

export interface PeriodoEvaluacionOpcion {
  fk_tperiodo_evaluacion: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  tiene_seguimiento: boolean
}

export interface ParticipanteOpcion {
  tipo_persona: string
  fk_tfuncionario: number | null
  fk_testudiante: number | null
  fk_tpadre: number | null
  nombre: string
  calidad_sugerida: string | null
  detalle: string | null
}
