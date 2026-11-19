import type { SenalRiesgo } from "@/features/gestion-estudiantil/prevencion/api/types"
import { etiquetaSenal } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { CONDICIONES } from "@/features/gestion-estudiantil/prevencion/utils/parametros"

/**
 * Etiqueta de cada señal; «Condiciones de la matrícula» lleva entre paréntesis el detalle (etiquetas de lista)
 * solo cuando el backend lo envía (usuarios que ven lo sensible; para el resto llega un texto genérico sin etiqueta).
 */
export function etiquetasAlertas(senales: SenalRiesgo[], condiciones: string[]): string[] {
  const detalle = condiciones
    .map((c) => CONDICIONES.find((o) => o.value === c)?.label)
    .filter((l): l is string => Boolean(l))
  return senales.map((s) =>
    s === "CONDICIONES_MATRICULA" && detalle.length > 0 ? `${etiquetaSenal(s)} (${detalle.join(", ")})` : etiquetaSenal(s),
  )
}
