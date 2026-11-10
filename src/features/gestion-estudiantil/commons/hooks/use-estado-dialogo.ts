import { useState } from "react"

/** Estado común de un modal de operación: intento de envío (muestra errores de campo) y error del backend. */
export function useEstadoDialogo() {
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  return { intento, setIntento, error, setError }
}
