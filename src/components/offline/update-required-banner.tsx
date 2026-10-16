import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { WarningIcon } from "@/components/ui/icons"
import { updateRequiredStore } from "@/lib/app-version"
import { useOutboxSummary } from "@/lib/offline/outbox/hooks"

/**
 * "Actualiza la app" (D-7): el gateway dice que esta versión ya no es la
 * mínima. Solo aparece con la cola vacía, para no recargar con cambios sin
 * subir: primero se sincroniza, después se actualiza.
 */
export function UpdateRequiredBanner() {
  const required = useSyncExternalStore(updateRequiredStore.subscribe, updateRequiredStore.get, () => false)
  const { total } = useOutboxSummary()
  if (!required || total > 0) return null
  return (
    <div role="alert" className="flex items-center gap-2 bg-orange-22 px-4 py-2 text-sm text-orange">
      <WarningIcon className="size-4 shrink-0" aria-hidden />
      <p className="grow">Hay una versión nueva de la aplicación. Actualiza para seguir trabajando sin conexión.</p>
      <Button variant="outline" color="warning" onClick={() => window.location.reload()}>
        Actualizar
      </Button>
    </div>
  )
}
