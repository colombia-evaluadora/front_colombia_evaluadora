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
      <DialogContent data-slot="logout-device-dialog">
        <DialogHeader>
          <DialogTitle>Cerrar sesión en este equipo</DialogTitle>
          <DialogDescription>
            Tus datos guardados
            {pendientes > 0 ? ` y tus ${pendientes} cambios sin sincronizar` : ""} se quedan en este equipo para
            que sigas trabajando sin conexión. Para volver a entrar necesitarás tu contraseña
            {hasPin ? " o tu PIN" : ""}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" color="destructive" onClick={onWipe}>
            Borrar los datos de este equipo…
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" color="neutral" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button color="primary" onClick={onLogout}>
              Cerrar sesión
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
