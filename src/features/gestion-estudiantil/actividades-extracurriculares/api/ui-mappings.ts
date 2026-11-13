import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import type { BadgeColor } from "@/features/gestion-estudiantil/commons/utils/badge-color"
import type {
  EstadoActividad,
  EstadoServicioSocial,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

export const ESTADOS_ACTIVIDAD_FILTRO: Opcion[] = [
  { value: "ACTIVA", label: "Activa" },
  { value: "INACTIVA", label: "Inactiva" },
]

export const ESTADO_ACTIVIDAD_COLOR: Record<EstadoActividad, BadgeColor> = {
  ACTIVA: "success",
  INACTIVA: "muted",
}

export const ESTADOS_SERVICIO_SOCIAL_FILTRO: Opcion[] = [
  { value: "CUMPLIDO", label: "Cumplido" },
  { value: "EN_CURSO", label: "En curso" },
]

export const ESTADO_SERVICIO_SOCIAL_ETIQUETA: Record<EstadoServicioSocial, string> = {
  CUMPLIDO: "Cumplido",
  EN_CURSO: "En curso",
}

export const ESTADO_SERVICIO_SOCIAL_COLOR: Record<EstadoServicioSocial, BadgeColor> = {
  CUMPLIDO: "success",
  EN_CURSO: "info",
}
