import { createContext, useContext } from "react"

/**
 * Solo lectura: los campos se ven deshabilitados y los botones que solo modifican
 * van envueltos en `<SoloEdicion>`.
 */
export const SoloLecturaActividadContext = createContext(false)

export function useSoloLecturaActividad(): boolean {
  return useContext(SoloLecturaActividadContext)
}
