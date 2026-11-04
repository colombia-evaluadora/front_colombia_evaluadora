import { useEffect, useState } from "react"

const ESPERA_MS = 300

/** Texto de un combo con búsqueda en servidor: lo tecleado y, tras la pausa, lo que se consulta. */
export function useBusquedaDiferida(espera = ESPERA_MS) {
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto.trim()), espera)
    return () => clearTimeout(t)
  }, [texto, espera])
  return { setTexto, busqueda }
}
