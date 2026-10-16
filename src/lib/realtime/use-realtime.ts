import { useEffect, useEffectEvent, useSyncExternalStore } from "react"

import { realtime } from "@/lib/realtime"
import type { RealtimeEvent, RealtimeStatus, RealtimeTopic } from "@/lib/realtime/protocol"

const noop = () => () => undefined

/** Estado de la conexión en vivo (`idle` si el tiempo real está desactivado). */
export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(
    realtime ? realtime.onStatus : noop,
    () => realtime?.getStatus() ?? "idle",
    () => "idle",
  )
}

/**
 * Suscribe la pantalla a un tópico mientras esté montada. El socket se abre
 * con la primera suscripción (siempre bajo `/app`, o sea con sesión) y se
 * cierra en logout (`stopRealtime`). `topic` nulo = no suscribir.
 */
export function useRealtimeTopic(
  topic: RealtimeTopic | null | undefined,
  onEvent: (event: RealtimeEvent) => void,
  onResync?: () => void,
) {
  const handleEvent = useEffectEvent(onEvent)
  const handleResync = useEffectEvent(() => onResync?.())

  useEffect(() => {
    if (!realtime || !topic) return
    realtime.start()
    return realtime.subscribe(topic, {
      onEvent: (e) => handleEvent(e),
      onResync: () => handleResync(),
    })
  }, [topic])
}
