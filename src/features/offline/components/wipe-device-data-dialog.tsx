import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WarningIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { wipeDeviceData } from "@/lib/offline/device-data"
import { useOutboxSummary } from "@/lib/offline/outbox/hooks"
import { getOutboxUser } from "@/lib/offline/outbox/store"
import { getActivePersistUser } from "@/lib/offline/query-persister"
import { useConnectivity } from "@/lib/offline/use-connectivity"

type Paso = "aviso" | "confirmar-pendientes"

/**
 * "Borrar los datos de este equipo" (D-12): la única forma de borrar lo
 * guardado en la app instalada. Aviso fuerte siempre; con cambios sin
 * sincronizar se bloquea detrás de una segunda confirmación (y se ofrece
 * sincronizar primero). Al terminar, quien lo abre cierra la sesión.
 */
export function WipeDeviceDataDialog({
  open,
  onOpenChange,
  onWiped,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWiped: () => void
}) {
  const summary = useOutboxSummary()
  const offline = useConnectivity().status === "offline"
  const [paso, setPaso] = useState<Paso>("aviso")
  const [busy, setBusy] = useState(false)
  const pendientes = summary.total

  function cerrar(next: boolean) {
    if (busy) return
    if (!next) setPaso("aviso")
    onOpenChange(next)
  }

  async function borrar() {
    const sub = getActivePersistUser() ?? getOutboxUser()
    setBusy(true)
    try {
      if (sub) await wipeDeviceData(sub)
    } finally {
      setBusy(false)
      setPaso("aviso")
    }
    onWiped()
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent data-slot="wipe-device-data-dialog">
        <DialogHeader>
          <DialogTitle>
            {paso === "aviso" ? "Borrar los datos de este equipo" : "¿Seguro? Esto no se puede deshacer"}
          </DialogTitle>
          <DialogDescription>
            {paso === "aviso"
              ? "Se borrarán de este equipo tus datos guardados para trabajar sin conexión (planillas, asistencia, listas de estudiantes, actividades y archivos), tu PIN y tu acceso sin conexión. Para volver a trabajar sin conexión tendrás que entrar con internet y preparar el equipo de nuevo."
              : `Se perderán para siempre ${pendientes} cambios que nunca llegaron al servidor (notas, asistencia u observaciones). Nadie podrá recuperarlos.`}
          </DialogDescription>
        </DialogHeader>

        {paso === "aviso" && pendientes > 0 && (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-red-22 px-3 py-2 text-sm text-red">
            <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Tienes {pendientes} cambios sin sincronizar. Si borras ahora se perderán. Sincroniza primero cuando tengas
              conexión.
            </span>
          </p>
        )}

        <DialogFooter>
          {paso === "confirmar-pendientes" ? (
            <>
              <Button variant="outline" color="neutral" disabled={busy} onClick={() => setPaso("aviso")}>
                Volver
              </Button>
              <Button variant="fill" color="destructive" disabled={busy} onClick={() => void borrar()}>
                {busy ? "Borrando…" : "Sí, borrar todo"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" color="neutral" disabled={busy} onClick={() => cerrar(false)}>
                Cancelar
              </Button>
              {pendientes > 0 && (
                <Button
                  variant="outline"
                  color="primary"
                  disabled={offline}
                  title={offline ? "Necesitas conexión para sincronizar." : undefined}
                  nativeButton={false}
                  render={<Link to={paths.app.sincronizar.getHref()} onClick={() => cerrar(false)} />}
                >
                  Sincronizar primero
                </Button>
              )}
              <Button
                variant="fill"
                color="destructive"
                disabled={busy}
                onClick={() => (pendientes > 0 ? setPaso("confirmar-pendientes") : void borrar())}
              >
                {pendientes > 0 ? "Borrar de todas formas…" : busy ? "Borrando…" : "Borrar los datos"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
