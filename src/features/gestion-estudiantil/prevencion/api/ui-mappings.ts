import type { BadgeColor } from "@/features/gestion-estudiantil/commons/utils/badge-color"
import type { EstadoAcompanamiento, EstadoCaracterizacion, EstadoReporteConsumo, EstadoEstrategia, EstadoPlan, EstadoSenalSM, NivelRiesgo, SenalRiesgo, SeveridadSaludMental, TipoAcompanamiento, EstadoAccionAcomp, EstadoGestion, UmbralGestion } from "@/features/gestion-estudiantil/prevencion/api/types"

/** Etiquetas de las señales del tablero (nunca el código). */
export const SENAL_ETIQUETA: Record<SenalRiesgo, string> = {
  INASISTENCIA: "Inasistencia",
  RENDIMIENTO_ACADEMICO: "Rendimiento académico",
  CONVIVENCIA: "Convivencia",
  REPORTE_DOCENTE: "Reporte docente",
  ANOTACIONES_NEGATIVAS: "Anotaciones negativas",
  COMPROMISOS_INCUMPLIDOS: "Compromisos incumplidos",
  EXTRAEDAD: "Extraedad",
  RIESGO_EXTRAEDAD: "Riesgo de extraedad",
  FACTORES_VULNERABILIDAD: "Factores de vulnerabilidad",
  CONDICIONES_MATRICULA: "Condiciones de la matrícula",
  SALUD_MENTAL: "Salud mental",
}

/** Señales que acepta el filtro `SENAL` del tablero (§9.1). */
export const SENALES_FILTRO: SenalRiesgo[] = [
  "INASISTENCIA",
  "RENDIMIENTO_ACADEMICO",
  "CONVIVENCIA",
  "REPORTE_DOCENTE",
  "ANOTACIONES_NEGATIVAS",
  "COMPROMISOS_INCUMPLIDOS",
  "SALUD_MENTAL",
]

export const etiquetaSenal = (codigo: string): string => SENAL_ETIQUETA[codigo as SenalRiesgo] ?? codigo

export const ESTADO_PLAN_ETIQUETA: Record<EstadoPlan, string> = {
  PROPUESTO: "Propuesto",
  ACTIVO: "Activo",
  EN_SEGUIMIENTO: "En seguimiento",
  SUPERADO: "Superado",
  INCUMPLIDO: "Incumplido",
  CERRADO_MATRICULA: "Cerrado por matrícula",
  ANULADO: "Anulado",
}

export const ESTADO_PLAN_COLOR: Record<EstadoPlan, BadgeColor> = {
  PROPUESTO: "info",
  ACTIVO: "primary",
  EN_SEGUIMIENTO: "warning",
  SUPERADO: "success",
  INCUMPLIDO: "destructive",
  CERRADO_MATRICULA: "muted",
  ANULADO: "muted",
}

export const NIVEL_COLOR: Record<NivelRiesgo, BadgeColor> = {
  BAJO: "success",
  MEDIO: "warning",
  ALTO: "destructive",
}

export const SEVERIDAD_SALUD_MENTAL_ETIQUETA: Record<SeveridadSaludMental, string> = {
  VITAL: "Vital",
  CRITICO: "Crítico",
  SEGUIMIENTO: "Seguimiento",
  POR_VALORAR: "Por valorar",
}

/** Estados del plan que ofrece el filtro del listado (valor del backend, etiqueta de pantalla). */
export const ESTADOS_PLAN_FILTRO = (Object.keys(ESTADO_PLAN_ETIQUETA) as EstadoPlan[]).map((value) => ({
  value,
  label: ESTADO_PLAN_ETIQUETA[value],
}))

export const ESTADO_SM_ETIQUETA: Record<EstadoSenalSM, string> = {
  POR_VALORAR: "Por valorar",
  VALORADA: "Valorada",
  EN_ATENCION: "En atención",
  REMITIDA: "Remitida externamente",
  CERRADA: "Cerrada",
}

export const ESTADO_SM_COLOR: Record<EstadoSenalSM, BadgeColor> = {
  POR_VALORAR: "warning",
  VALORADA: "primary",
  EN_ATENCION: "info",
  REMITIDA: "info",
  CERRADA: "muted",
}

export const SEVERIDAD_SM_COLOR: Record<SeveridadSaludMental, BadgeColor> = {
  SEGUIMIENTO: "warning",
  CRITICO: "destructive",
  VITAL: "destructive",
  POR_VALORAR: "muted",
}

/** Estados que ofrece el filtro de Salud mental (valor del backend, etiqueta de pantalla). */
export const ESTADOS_SM_FILTRO = (Object.keys(ESTADO_SM_ETIQUETA) as EstadoSenalSM[]).map((value) => ({
  value,
  label: ESTADO_SM_ETIQUETA[value],
}))

export const ESTADO_ESTRATEGIA_ETIQUETA: Record<EstadoEstrategia, string> = {
  PLANEADA: "Planeada",
  EN_EJECUCION: "En ejecución",
  FINALIZADA: "Finalizada",
}

export const ESTADO_ESTRATEGIA_COLOR: Record<EstadoEstrategia, BadgeColor> = {
  PLANEADA: "muted",
  EN_EJECUCION: "primary",
  FINALIZADA: "muted",
}

/** Estados que ofrece el filtro de Estrategias (el backend los deriva de las fechas). */
export const ESTADOS_ESTRATEGIA_FILTRO = (Object.keys(ESTADO_ESTRATEGIA_ETIQUETA) as EstadoEstrategia[]).map((value) => ({
  value,
  label: ESTADO_ESTRATEGIA_ETIQUETA[value],
}))

export const ESTADO_CARACTERIZACION_ETIQUETA: Record<EstadoCaracterizacion, string> = {
  SIN_DILIGENCIAR: "Sin diligenciar",
  POR_CONFIRMAR: "Por confirmar",
  CONFIRMADA: "Confirmada",
}

export const ESTADO_CARACTERIZACION_COLOR: Record<EstadoCaracterizacion, BadgeColor> = {
  SIN_DILIGENCIAR: "muted",
  POR_CONFIRMAR: "warning",
  CONFIRMADA: "success",
}

/** Estados que ofrece el filtro de Caracterización (valor del backend, etiqueta de pantalla). */
export const ESTADOS_CARACTERIZACION_FILTRO = (
  Object.keys(ESTADO_CARACTERIZACION_ETIQUETA) as EstadoCaracterizacion[]
).map((value) => ({ value, label: ESTADO_CARACTERIZACION_ETIQUETA[value] }))

/** Colores de los estados del acompañamiento (CHECK de V685, no TLV); la etiqueta sale de `estado_nombre`. */
export const ESTADO_ACOMP_COLOR: Record<EstadoAcompanamiento, BadgeColor> = {
  ABIERTO: "success",
  EN_SEGUIMIENTO: "primary",
  CERRADO: "muted",
  ANULADO: "destructive",
}

/** Opciones del filtro Estado: no hay endpoint que las dé (pendiente de backend). Única copia. */
export const ESTADOS_ACOMP_FILTRO: { value: EstadoAcompanamiento; label: string }[] = [
  { value: "ABIERTO", label: "Abierto" },
  { value: "EN_SEGUIMIENTO", label: "En seguimiento" },
  { value: "CERRADO", label: "Cerrado" },
  { value: "ANULADO", label: "Anulado" },
]

export const ESTADO_REPORTE_CONSUMO_COLOR: Record<EstadoReporteConsumo, BadgeColor> = {
  PENDIENTE_REVISION: "warning",
  RECIBIDO: "info",
  ATENDIDO: "muted",
}

/** Opciones del filtro Estado de Reportes recibidos (pendiente de backend). Única copia. */
export const ESTADOS_REPORTE_CONSUMO_FILTRO: { value: EstadoReporteConsumo; label: string }[] = [
  { value: "PENDIENTE_REVISION", label: "Pendiente de revisión" },
  { value: "RECIBIDO", label: "Recibido" },
  { value: "ATENDIDO", label: "Atendido" },
]

/** Nombre de cada tipo de acompañamiento en títulos y encabezados (§9.9, §9.10). */
export const TITULO_ACOMP: Record<TipoAcompanamiento, string> = {
  EMBARAZO: "Acompañamiento por embarazo y maternidad/paternidad",
  CONSUMO: "Acompañamiento por consumo de sustancias psicoactivas",
}

/** Estado derivado de una acción del acompañamiento (lo calcula el backend; no es TLV). Única copia. */
export const ESTADO_ACCION_ACOMP: Record<EstadoAccionAcomp, { label: string; color: BadgeColor }> = {
  REALIZADA: { label: "Realizada", color: "success" },
  PENDIENTE: { label: "Pendiente", color: "warning" },
  VENCIDA: { label: "Vencida", color: "destructive" },
}

/** Colores de la gestión de la alerta (§9.11); la etiqueta sale de `estado_nombre` / `umbral_nombre` del backend. */
export const ESTADO_GESTION_COLOR: Record<EstadoGestion, BadgeColor> = {
  PENDIENTE: "warning",
  EN_GESTION: "primary",
  ESCALADA: "destructive",
  RESUELTA: "success",
}

export const UMBRAL_GESTION_COLOR: Record<UmbralGestion, BadgeColor> = {
  ALERTA: "muted",
  INTERVENCION: "orange",
}
