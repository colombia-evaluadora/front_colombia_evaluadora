import { useEffect, useState } from "react"

import { useConnectivity } from "@/lib/offline/use-connectivity"

/**
 * Cuánto se tolera un indicador de carga SIN conexión antes de reemplazarlo
 * por el aviso de "no está guardada en este equipo". Sin red nada de lo que
 * falta va a llegar: las queries sin datos ya fallan al instante
 * (`OfflineAwareQueryClient`), así que un skeleton que sigue visible es una
 * query deshabilitada en cascada (su padre falló), una carga local que no
 * resuelve o una request colgada de una red "lie-fi".
 */
export const OFFLINE_STALL_MS = 1_500

/**
 * `true` cuando `loading` lleva `delayMs` activo con el equipo sin conexión.
 * Con red siempre es `false` (la carga sigue su curso normal). El plazo corre
 * desde lo último que pase: que empiece la carga o que se caiga la red.
 */
export function useOfflineStall(loading: boolean, delayMs: number = OFFLINE_STALL_MS): boolean {
  const offline = useConnectivity().status === "offline"
  const waiting = loading && offline
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    if (!waiting) {
      setStalled(false)
      return
    }
    const timer = setTimeout(() => setStalled(true), delayMs)
    return () => clearTimeout(timer)
  }, [waiting, delayMs])

  return waiting && stalled
}
