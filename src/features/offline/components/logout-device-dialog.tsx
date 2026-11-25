import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useOutboxSummary } from "@/lib/offline/outbox/hooks"
import { vaultStore } from "@/lib/offline/vault"

/**
 * "Cerrar sesión" en la app instalada (D-12): NO borra lo guardado. Un docente
 * que cierra sesión por error sin red perdería meses de datos preparados sin
 * forma de volver a bajarlos. La app queda bloqueada: para volver a entrar
 * hace falta la contraseña (con o sin red) o el PIN. Borrar es aparte y
 * explícito ("Borrar los datos de este equipo").
 */
export function LogoutDeviceDialog({
  open,
  onOpenChange,
  onLogout,
  onWipe,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogout: () => void
  onWipe: () => void
}) {
  const summary = useOutboxSummary()
  const hasPin = useSyncExternalStore(vaultStore.subscribe, vaultStore.get, () => "sin-pin" as const) !== "sin-pin"
  const pendientes = summary.total

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="grid-cols-[minmax(0,1fr)]" data-slot="logout-device-dialog">
        <DialogHeader>
          <DialogTitle>Cerrar sesión en este equipo</DialogTitle>
          <DialogDescription>
            Sus datos guardados
            {pendientes > 0 ? ` y sus ${pendientes} cambios sin sincronizar` : ""} se quedan en este equipo para
            que siga trabajando sin conexión. Para volver a entrar necesitará su contraseña
            {hasPin ? " o su PIN" : ""}.
          </DialogDescription>
        </DialogHeader>
        {/* En su propia fila: los tres botones no caben en el ancho del modal y el primario se cortaba. */}
        <Button variant="link" color="destructive" className="justify-self-start px-0" onClick={onWipe}>
          Borrar los datos de este equipo…
        </Button>
        <DialogFooter>
          <Button variant="outline" color="neutral" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button color="primary" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
