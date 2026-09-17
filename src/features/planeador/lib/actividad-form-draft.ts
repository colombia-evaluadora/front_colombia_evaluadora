import type { Actividad } from "@/features/planeador/api/types/actividad"

/**
 * Borrador temporal del form de Actividad (`EditarActividadForm`), para
 * sobrevivir el viaje de ida y vuelta a "Ver recurso"
 * (`planeador-recurso-preview-page.tsx`): esa vista previa vive en una ruta
 * aparte, así que navegar hacia ella desmonta por completo el form de
 * crear/editar actividad — sin este borrador, "Cerrar" en la vista previa
 * volvía a un form en blanco (o a los datos originales, sin lo que el
 * docente ya había tipeado).
 *
 * Se guarda en `sessionStorage` (no sobrevive a cerrar la pestaña, que es
 * lo esperado para un borrador) bajo una única clave — solo puede haber un
 * form de Actividad abierto a la vez — identificada por `draftKey`: el id
 * real de la actividad en edición, o el sentinel `"nueva"` en el alta
 * (donde el id es aleatorio y cambia en cada montaje, ver
 * `crearActividadVacia`).
 */
export type ActividadFormDraftKey = number | "nueva"

const STORAGE_KEY = "planeador:actividad-form-draft"

/** El docente puede tardarse; pero pasado esto ya no es "un vistazo rápido
 *  al recurso" sino una sesión vieja — se descarta para no resucitar un
 *  borrador de otro día si por lo que sea nunca se consumió. */
const MAX_DRAFT_AGE_MS = 10 * 60 * 1000

interface StoredDraft {
  draftKey: ActividadFormDraftKey
  values: Actividad
  savedAt: number
}

export function saveActividadFormDraft(draftKey: ActividadFormDraftKey, values: Actividad): void {
  try {
    const stored: StoredDraft = { draftKey, values, savedAt: Date.now() }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // sessionStorage puede fallar (modo privado, cuota llena, etc.) — el
    // borrador es una mejora de UX, no algo de lo que dependa el form.
  }
}

/** Lee el borrador si corresponde a `draftKey` y no está vencido, y lo
 *  borra de una — un borrador solo se restaura una vez. */
export function consumeActividadFormDraft(draftKey: ActividadFormDraftKey): Actividad | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(STORAGE_KEY)

    const stored = JSON.parse(raw) as StoredDraft
    if (stored.draftKey !== draftKey) return null
    if (Date.now() - stored.savedAt > MAX_DRAFT_AGE_MS) return null
    return stored.values
  } catch {
    return null
  }
}
