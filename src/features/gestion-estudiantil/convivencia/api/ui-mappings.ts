import type { BadgeColor } from "@/features/gestion-estudiantil/commons/utils/badge-color"
import { formatFecha, formatHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { EstadoCasoCodigo } from "@/features/gestion-estudiantil/convivencia/api/types"

/** Color del badge de Estado (G.2.CAS.LIS.1). */
export const COLOR_ESTADO: Record<EstadoCasoCodigo, BadgeColor> = {
  REPORTADO: "info",
  EN_ATENCION: "warning",
  REMITIDO: "orange",
  EN_SEGUIMIENTO: "primary",
  CERRADO: "success",
  ANULADO: "muted",
}

export const ESTADOS_FINALES: EstadoCasoCodigo[] = ["CERRADO", "ANULADO"]

export const esFinal = (estado: EstadoCasoCodigo | null | undefined) => estado != null && ESTADOS_FINALES.includes(estado)

/** Fecha de los hechos tal como la muestra el listado: Desconocida, o fecha y hora (o Hora desconocida). */
export function fechaHechosTexto(c: {
  fecha_hechos_conocida?: boolean
  fecha_hechos?: string | null
  hora_hechos_conocida?: boolean | null
  hora_hechos?: string | null
}): { fecha: string; hora: string | null } {
  if (!c.fecha_hechos_conocida || !c.fecha_hechos) return { fecha: "Desconocida", hora: null }
  return {
    fecha: formatFecha(c.fecha_hechos),
    hora: c.hora_hechos_conocida && c.hora_hechos ? formatHora(c.hora_hechos) : "Hora desconocida",
  }
}

export const numeroCaso = (numero: string | number | null | undefined) => (numero == null ? "" : `Caso ${numero}`)

/** Códigos internos (TLISTA_VALOR.VALOR) de los que dependen las reglas del formulario. */
export const COD = {
  danoFisico: "DANO_FISICO",
  agresionFisica: "AGRESION_FISICA",
  seguimiento: "SEGUIMIENTO",
  reporteSiuce: "REPORTE_SIUCE",
  /** fn_convivencia_accion_requiere_entidad (V144). */
  conEntidad: ["INFORMACION_POLICIA", "REMISION_AUTORIDAD"],
  afectado: "AFECTADO",
  funcionarioEE: ["DOCENTE", "DIRECTIVO_DOCENTE", "ADMINISTRATIVO"],
} as const

export const esGrave = (tipoCodigo: string | null | undefined) => tipoCodigo === "TIPO_II" || tipoCodigo === "TIPO_III"
