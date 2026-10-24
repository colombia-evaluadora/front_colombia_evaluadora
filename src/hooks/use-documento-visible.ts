import { useSyncExternalStore } from "react"

function suscribir(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange)
  return () => document.removeEventListener("visibilitychange", onChange)
}

/**
 * `true` mientras la pestaña está visible (`document.visibilityState`). Con la pestaña oculta
 * (otra pestaña, ventana minimizada) el usuario no está viendo la pantalla aunque siga montada.
 */
export function useDocumentoVisible(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => document.visibilityState === "visible",
    () => true,
  )
}
