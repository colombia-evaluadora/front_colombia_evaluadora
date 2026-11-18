export type PestanaConfiguracion = "catalogo" | "proceso" | "riesgo" | "servicio-social" | "remisiones" | "niveles"

/** Orden del prototipo (G.10) más Niveles de convivencia (§3.6), que la especificación pide aunque el prototipo no la tenga. */
export const PESTANAS_CONFIGURACION: { value: PestanaConfiguracion; label: string }[] = [
  { value: "catalogo", label: "Catálogo de anotaciones" },
  { value: "proceso", label: "Proceso disciplinario" },
  { value: "riesgo", label: "Parámetros de riesgo" },
  { value: "servicio-social", label: "Servicio social" },
  { value: "remisiones", label: "Seguimiento de remisiones" },
  { value: "niveles", label: "Niveles de convivencia" },
]

const CLAVE_PESTANA = "configuracion-ge-pestana"

/** La pestaña vuelve a ser la misma al regresar a la página (y la ruta vieja del catálogo abre la suya). */
export function pestanaConfiguracionGuardada(): PestanaConfiguracion {
  try {
    const guardada = sessionStorage.getItem(CLAVE_PESTANA)
    return PESTANAS_CONFIGURACION.some((p) => p.value === guardada) ? (guardada as PestanaConfiguracion) : "catalogo"
  } catch {
    return "catalogo"
  }
}

export function guardarPestanaConfiguracion(pestana: PestanaConfiguracion) {
  try {
    sessionStorage.setItem(CLAVE_PESTANA, pestana)
  } catch {
    // Sin almacenamiento: la pestaña solo se recuerda mientras la página está montada.
  }
}
