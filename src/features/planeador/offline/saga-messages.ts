import { getErrorMessage } from "@/lib/api-client"
import { OutboxRejectedError } from "@/lib/offline/outbox/engine"

import type { StepOutcome } from "@/features/planeador/offline/run-saga"
import { SAGA_KINDS } from "@/features/planeador/offline/saga-handlers"

export const SAGA_QUEUED_MESSAGE =
  "Guardado en este equipo. Se enviará paso a paso cuando haya conexión; puedes seguirlo en Cambios pendientes."

export const SAGA_PARTIAL_QUEUED_MESSAGE =
  "Se perdió la conexión a mitad del guardado. Lo que faltó quedó en este equipo y se enviará cuando vuelva la conexión (Cambios pendientes)."

/** Error al armar/encolar (cuota, archivo > 10 MB…): el texto ya es para el docente. */
export function mensajeErrorSaga(error: unknown): string {
  return error instanceof OutboxRejectedError ? error.message : getErrorMessage(error)
}

const FRASE: Record<string, string> = {
  [SAGA_KINDS.actividadMateriales]: "los materiales de apoyo",
  [SAGA_KINDS.actividadInstrumento]: "la definición del instrumento de evaluación",
  [SAGA_KINDS.actividadAdaptaciones]: "las adaptaciones curriculares",
  [SAGA_KINDS.actividadEstudiantes]: "los estudiantes de la actividad",
  [SAGA_KINDS.actividadCriterio]: "todos los criterios de la unidad",
  [SAGA_KINDS.actividadEditar]: "los datos de la actividad",
  [SAGA_KINDS.actividadUnidad]: "la unidad temática asociada",
}

/** "los materiales de apoyo (motivo)" por cada paso fallido; un solo renglón para los criterios. */
export function fallosDeSaga(outcomes: StepOutcome[]): string[] {
  const fallos: string[] = []
  let criterioInformado = false
  for (const o of outcomes) {
    if (o.ok || o.index === 0) continue
    if (o.kind === SAGA_KINDS.actividadCriterio) {
      if (criterioInformado) continue
      criterioInformado = true
    }
    fallos.push(`${FRASE[o.kind] ?? o.label} (${getErrorMessage(o.error)})`)
  }
  return fallos
}

export function recursosOmitidosDe(outcomes: StepOutcome[]): string[] {
  const materiales = outcomes.find((o) => o.ok && o.kind === SAGA_KINDS.actividadMateriales)
  return (materiales?.result as { recursosOmitidos?: string[] } | undefined)?.recursosOmitidos ?? []
}
