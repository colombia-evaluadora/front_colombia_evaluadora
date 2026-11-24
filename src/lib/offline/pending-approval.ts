/**
 * Texto único para un cambio que se sincronizó pero el backend dejó como
 * solicitud (regla 75: el periodo ya no es calificable). Lo ve el docente en
 * el aviso al sincronizar, en «Cambios pendientes» y en el formulario.
 * Retroalimentación de soporte (2026-11): debe decir claramente que ya subió
 * y que todavía no es definitivo.
 */
export const PENDIENTE_APROBACION_NOTE =
  "Sincronizado. Queda pendiente de aprobación del coordinador; no se ve como definitivo hasta que lo apruebe."

/** Mismo mensaje para un guardado en línea (no hubo sincronización). */
export const GUARDADO_PENDIENTE_APROBACION =
  "Guardado. Queda pendiente de aprobación del coordinador; no se ve como definitivo hasta que lo apruebe."
