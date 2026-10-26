import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { realtime } from "@/lib/realtime"
import { useRealtimeStatus } from "@/lib/realtime/use-realtime"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { MiDisponibilidad } from "@/features/comunicaciones/chat/api/types"
import { INACTIVIDAD_MS, estaInactivo } from "@/features/comunicaciones/chat/lib/disponibilidad"

const EVENTOS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "focus"] as const
const REVISAR_CADA_MS = 30_000

/**
 * Ausente automático (V560): esta pestaña avisa por el socket cuando lleva `inactividadMinutos`
 * sin uso (`inactivo`) y cuando se vuelve a usar (`activo`). El servidor decide: solo con todas
 * las pestañas del usuario inactivas pasa En línea → Ausente, y nunca toca un estado fijado a mano.
 * Va en el layout (el socket es de toda la app). Sin tiempo real no hace nada.
 */
export function DetectorInactividad() {
  const queryClient = useQueryClient()
  const status = useRealtimeStatus()
  const ultima = useRef(Date.now())
  const inactivo = useRef(false)

  useEffect(() => {
    if (!realtime) return
    const umbral = () => {
      const min = queryClient.getQueryData<MiDisponibilidad>(chatKeys.disponibilidad)?.inactividadMinutos
      return min && min > 0 ? min * 60_000 : INACTIVIDAD_MS
    }
    const actividad = () => {
      if (document.visibilityState === "hidden") return
      ultima.current = Date.now()
      if (inactivo.current) {
        inactivo.current = false
        realtime?.sendEphemeral("presencia", "activo")
      }
    }
    const revisar = () => {
      if (!inactivo.current && estaInactivo(ultima.current, Date.now(), umbral())) {
        inactivo.current = true
        realtime?.sendEphemeral("presencia", "inactivo")
      }
    }
    for (const e of EVENTOS) window.addEventListener(e, actividad, { passive: true })
    document.addEventListener("visibilitychange", actividad)
    const t = setInterval(revisar, REVISAR_CADA_MS)
    return () => {
      for (const e of EVENTOS) window.removeEventListener(e, actividad)
      document.removeEventListener("visibilitychange", actividad)
      clearInterval(t)
    }
  }, [queryClient])

  // Socket nuevo (reconexión): el servidor lo cuenta activo; si la pestaña sigue inactiva, se repite.
  useEffect(() => {
    if (status === "open" && inactivo.current) realtime?.sendEphemeral("presencia", "inactivo")
  }, [status])

  return null
}
