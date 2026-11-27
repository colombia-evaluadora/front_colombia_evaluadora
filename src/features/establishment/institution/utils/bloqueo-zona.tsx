import type { Bloqueo } from "@/features/administration/listas-valor/components/dialog-bloqueo"

/**
 * Mensaje de `fn_est_validar_zona_sedes` (sso V572, Regla 21): «Estas sedes tienen una zona que Urbana no
 * permite: Sede A (Rural), Sede B (Rural). Cambie su zona antes de cambiar la del establecimiento.».
 */
const PATRON =
  /^Estas sedes tienen una zona que (.+?) no permite: (.+)\. Cambie su zona antes de cambiar la del establecimiento\.?$/

/**
 * El rechazo por zona se muestra como bloqueo «No se puede cambiar la zona» (informe, Sección 8.3) con las
 * sedes en lista, no como aviso. `null` si el error es otro.
 */
export function toBloqueoZona(message: string | null | undefined): Bloqueo | null {
  const match = PATRON.exec((message ?? "").trim())
  if (!match) return null
  const [, zona, sedes] = match
  return {
    titulo: "No se puede cambiar la zona",
    mensaje: (
      <>
        Estas sedes tienen una zona que <strong>{zona}</strong> no permite. Cambie su zona antes de
        cambiar la del establecimiento.
      </>
    ),
    // Cada sede termina en «(zona)»: se corta ahí para no partir un nombre que lleve coma.
    items: sedes.split(/(?<=\)), /),
  }
}
