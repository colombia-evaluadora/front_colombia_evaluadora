import type { BadgeColor } from "@/features/gestion-estudiantil/commons/utils/badge-color"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import type { EstadoCaso } from "@/features/gestion-estudiantil/reintegracion/api/types"

/** Colores de estado (§10.5): Pendiente advierte; el trabajo en curso informa; lo logrado es éxito; Cerrado es neutro. */
export const ESTADO_CASO_COLOR: Record<EstadoCaso, BadgeColor> = {
  PENDIENTE: "warning",
  EN_CONTACTO: "info",
  DIAGNOSTICO: "info",
  INTERVENCION: "info",
  REINGRESO_APROBADO: "success",
  PERMANENCIA_VERIFICADA: "success",
  CERRADO: "muted",
}

/** Etiquetas de los siete estados del caso, en el orden de la Ruta. */
export const ESTADOS_CASO_FILTRO: Opcion[] = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CONTACTO", label: "En contacto" },
  { value: "DIAGNOSTICO", label: "Diagnóstico" },
  { value: "INTERVENCION", label: "Intervención" },
  { value: "REINGRESO_APROBADO", label: "Reingreso aprobado" },
  { value: "PERMANENCIA_VERIFICADA", label: "Permanencia verificada" },
  { value: "CERRADO", label: "Cerrado" },
]

export const etiquetaEstado = (estado: EstadoCaso) =>
  ESTADOS_CASO_FILTRO.find((e) => e.value === estado)?.label ?? estado
