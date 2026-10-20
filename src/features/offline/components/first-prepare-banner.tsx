import { useSyncExternalStore } from "react"

import { Progress } from "@/components/ui/progress"
import { CloudSyncIcon } from "@/components/ui/icons"
import { prepareStore } from "@/features/offline/lib/prepare-engine"

/**
 * La PRIMERA preparación automática del equipo (en la app instalada, al
 * primer ingreso) se muestra con su progreso: el docente tiene que saber que
 * conviene no cerrar la app hasta que termine. Las siguientes corren
 * calladas; el header muestra "Datos guardados: hace X".
 */
export function FirstPrepareBanner() {
  const snapshot = useSyncExternalStore(prepareStore.subscribe, prepareStore.getSnapshot, prepareStore.getSnapshot)
  if (!snapshot.running || !snapshot.firstRun || snapshot.origin !== "auto") return null
  const porcentaje = snapshot.total ? Math.round((snapshot.done / snapshot.total) * 100) : 0
  return (
    <div role="status" data-slot="first-prepare-banner" className="flex flex-col gap-2 bg-blue-22 px-4 py-2 text-sm text-blue">
      <p className="flex items-center gap-2 font-medium">
        <CloudSyncIcon aria-hidden className="size-4 shrink-0" />
        Guardando tus datos en este equipo para que puedas trabajar sin conexión ({snapshot.done} de {snapshot.total}).
        Puedes seguir usando la app; no la cierres hasta que termine.
      </p>
      <Progress value={porcentaje} aria-label="Progreso de la primera preparación" />
    </div>
  )
}
