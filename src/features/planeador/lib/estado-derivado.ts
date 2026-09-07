import type { ActividadStatus } from "@/features/planeador/api/types/actividad"

/**
 * El backend deriva 6 estados para `/actividades`, `/actividades/mias` y
 * `/actividades/calendario` (`PENDIENTE_POR_EVALUAR`, `EN_EVALUACION`,
 * `FINALIZADA`, `VENCIDA`, `PROGRAMADA`, `SIN_PROGRAMAR` — ver colección
 * Postman `planeador-pantalla-principal`), pero el front solo distingue 4
 * (`ActividadStatus`, una por card de resumen). `PROGRAMADA`/
 * `SIN_PROGRAMAR` no tienen card propia — caen a "pending" (todavía no
 * llegó el momento de evaluarlas), mismo criterio que "Pendientes por
 * evaluar".
 */
export function estadoDerivadoToStatus(estado: string): ActividadStatus {
  switch (estado) {
    case "PENDIENTE_POR_EVALUAR":
      return "pending"
    case "EN_EVALUACION":
      return "in-progress"
    case "FINALIZADA":
      return "completed"
    case "VENCIDA":
      return "cancelled"
    case "PROGRAMADA":
    case "SIN_PROGRAMAR":
    default:
      return "pending"
  }
}

/**
 * Inverso — para armar el `estados` que se manda al filtrar por una card de
 * resumen (`?estado=pending` en la URL → `PENDIENTE_POR_EVALUAR` en la
 * query). Sin equivalente 1:1 para `PROGRAMADA`/`SIN_PROGRAMAR`: no hay
 * ninguna card que los pida.
 */
export function statusToEstadoDerivado(status: ActividadStatus): string {
  switch (status) {
    case "pending":
      return "PENDIENTE_POR_EVALUAR"
    case "in-progress":
      return "EN_EVALUACION"
    case "completed":
      return "FINALIZADA"
    case "cancelled":
      return "VENCIDA"
  }
}
