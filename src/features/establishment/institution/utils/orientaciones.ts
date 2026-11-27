import { TEMAS_ORIENTACION } from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"

import type { EstadoOrientacionRecibida } from "@/features/establishment/institution/api/schema"
import type { OrientacionRecibida } from "@/features/establishment/institution/api/types/orientacion"

export const ESTADO_ORIENTACION_UI: Record<
  EstadoOrientacionRecibida,
  { label: string; color: "info" | "success" }
> = {
  ENVIADA: { label: "Enviada", color: "info" },
  ATENDIDA: { label: "Atendida", color: "success" },
}

/**
 * Temas de la orientación: por ahora la misma lista fija del formulario territorial (Cobertura 3.10).
 * Pasa a Lista de Valores en la siguiente iteración.
 */
export const TEMAS_ORIENTACION_RECIBIDA: readonly string[] = TEMAS_ORIENTACION

/** Mismo límite que valida el backend (sso `fn_orientacion_validar_respuesta`). */
export const RESPUESTA_MIN = 10
export const RESPUESTA_MAX = 1000

/** Ayuda del campo Respuesta y de la orientación (informe, 2.3 y 3.10). */
export const AYUDA_SIN_DATOS_SENSIBLES =
  "Escriba lo que hizo el establecimiento sin datos sensibles de estudiantes: ni documentos, ni diagnósticos, ni situaciones de protección."

/** `yyyy-MM-dd` → `dd/MM/yyyy`; vacío → «—». */
export function fechaCorta(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "")
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "—"
}

/** Roles del token que ven la pestaña (informe, 2.3). El backend lo vuelve a exigir. */
export const ROLES_ORIENTACIONES = ["CEVAL-RECTOR", "CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO"] as const

/** «Enviada el 02/05/2027 por Supervisor territorial»: la bajada de los dos modales. */
export function enviadaTexto(orientacion: Pick<OrientacionRecibida, "fechaEnvio" | "enviadaPor">) {
  return `Enviada el ${fechaCorta(orientacion.fechaEnvio)} por ${orientacion.enviadaPor}`
}
