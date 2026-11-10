import type { ReconocimientoRow } from "@/features/gestion-estudiantil/reconocimientos/api/types"

/** Leer, crear y modificar: roles de V630. SUPER_ADMINISTRADOR y PSICO_ORIENTADOR solo consultan. */
export const ROLES_ESCRIBEN_RECONOCIMIENTO = [
  "CEVAL-RECTOR",
  "CEVAL-COORDINADOR",
  "CEVAL-DIRECTOR_GRUPO",
  "CEVAL-DOCENTE",
]

/** Sugerencias por Puesto y Anular: solo RECTOR y COORDINADOR (los demás reciben 403). */
export const ROLES_SUPERVISAN_RECONOCIMIENTO = ["CEVAL-RECTOR", "CEVAL-COORDINADOR"]

export interface AccionesReconocimiento {
  verDetalle: boolean
  modificar: boolean
  anular: boolean
  mencionHonor: boolean
}

/**
 * Qué ofrece el menú ⋮ de una fila: las banderas `puede_modificar` y `puede_anular` las calcula el
 * backend con la regla del gate (autor, alcance, estado); la mención no se genera de uno anulado.
 */
export function accionesReconocimiento(r: ReconocimientoRow): AccionesReconocimiento {
  return {
    verDetalle: true,
    modificar: r.puede_modificar,
    anular: r.puede_anular,
    mencionHonor: !r.anulado,
  }
}
