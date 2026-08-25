import type { AcademicPeriodStatus } from "@/features/establishment/academic-period/api/types/academic-period"
import type { EvaluationPeriodStatus } from "@/features/establishment/academic-period/api/types/evaluation-period"

type BadgeColor =
  | "primary"
  | "secondary"
  | "muted"
  | "destructive"
  | "info"
  | "warning"
  | "orange"
  | "success"
interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

// Las etiquetas de estado ahora las entrega el backend (`{ key, label }`, vía
// `useAcademicPeriodStatusesQuery`). Acá solo queda el color del badge, que el
// back no envía.
// Códigos de `ESTADOPERIODO` (VALOR de TLISTA_VALOR, confirmado contra la
// BD): A = Abierto, C = Cerrado, I = Inscripciones, P = Promociones,
// N = Nivelaciones.
export const ACADEMIC_PERIOD_STATUS_BADGE: Record<AcademicPeriodStatus, BadgeProps> = {
  A: { variant: "soft", color: "success" },
  N: { variant: "soft", color: "secondary" },
  I: { variant: "soft", color: "info" },
  P: { variant: "soft", color: "warning" },
  C: { variant: "soft", color: "destructive" },
}

// Estado del flag `reservationEnabled` (período de reserva de cupos). Es
// independiente del `ESTADOPERIODO` de arriba: "Activo" significa "el periodo
// actualmente permite nuevas solicitudes de cupo"; "Inactivo" lo contrario.
export const RESERVATION_STATUS_BADGE: Record<
  "active" | "inactive",
  BadgeProps
> = {
  active: { variant: "soft", color: "success" },
  inactive: { variant: "soft", color: "muted" },
}

export const EVALUATION_PERIOD_STATUSES: EvaluationPeriodStatus[] = [
  "1",
  "2",
  "3",
  "4",
]

// Códigos de `ESTADOPERIODOEVALUACION` (ver comentario en el tipo):
// 1 = Calificable, 2 = NO Calificable, 3 = Habilitados para algunas
// asignaturas, 4 = En Recuperaciones.
export const EVALUATION_PERIOD_STATUS_BADGE: Record<
  EvaluationPeriodStatus,
  BadgeProps
> = {
  "1": { variant: "soft", color: "success" },
  "2": { variant: "soft", color: "muted" },
  "3": { variant: "soft", color: "info" },
  "4": { variant: "soft", color: "warning" },
}

// `RatingScale.tipo` es el VALOR de TLISTA_VALOR (categoría TIPO_VALORACION,
// confirmado contra la BD: "1"/"2" — NO "Fortaleza"/"Debilidad", eso es el
// NOMBRE). Se indexa por `tipoName` (el NOMBRE resuelto por el backend) en
// vez de por `tipo`, para no depender de qué VALOR le tocó a cada uno.
export const RATING_SCALE_TYPE_BADGE: Record<string, BadgeProps> = {
  Fortaleza: { variant: "soft", color: "success" },
  Debilidad: { variant: "soft", color: "destructive" },
}
