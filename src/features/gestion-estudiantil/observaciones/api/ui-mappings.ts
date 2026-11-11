import type { ObservacionRow } from "@/features/gestion-estudiantil/observaciones/api/types"

/**
 * Registrar y corregir: el Responsable de grupo en los grupos de su designación (§8). RECTOR y COORDINADOR
 * tienen la ruta porque también pueden dirigir un grupo; si no lo dirigen, el backend responde 403.
 */
export const ROLES_REGISTRAN_OBSERVACION = ["CEVAL-DIRECTOR_GRUPO", "CEVAL-RECTOR", "CEVAL-COORDINADOR"]

export interface AccionesObservacion {
  verDetalle: boolean
  modificar: boolean
  anular: boolean
}

/**
 * Qué ofrece el menú ⋮ de una fila: `puede_modificar` (autor, sigue dirigiendo el grupo, período
 * Calificable) y `puede_anular` (Rector o Coordinador de la sede, Regla 3) las calcula el backend con
 * la regla de su gate.
 */
export function accionesObservacion(o: Pick<ObservacionRow, "puede_modificar" | "puede_anular">): AccionesObservacion {
  return { verDetalle: true, modificar: o.puede_modificar, anular: o.puede_anular }
}
