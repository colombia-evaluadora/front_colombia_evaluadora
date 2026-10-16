import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SpinnerIcon } from "@/components/ui/icons"
import { syncNow } from "@/lib/offline/outbox/engine"
import { useOutboxSummary } from "@/lib/offline/outbox/hooks"
import { clearOutbox, getOutboxUser, outboxStore } from "@/lib/offline/outbox/store"
import { getDeviceMode } from "@/lib/offline/query-persister"
import { useConnectivity } from "@/lib/offline/use-connectivity"

/**
 * Logout con cambios sin sincronizar (plan §7.8, D-F2-6): la outbox nunca se
 * borra sin avisar. "Salir y conservar" no aparece en equipo compartido.
 */
export function LogoutPendingDialog({
  open,
  onOpenChange,
  onLogout,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogout: () => void
}) {
  const summary = useOutboxSummary()
  const { status } = useConnectivity()
  const [busy, setBusy] = useState<"sync" | "discard" | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shared = getDeviceMode() === "compartido"
  const offline = status === "offline"

  async function sincronizarYSalir() {
    setBusy("sync")
    setError(null)
    await syncNow()
    setBusy(null)
    if (outboxStore.getSummary().total === 0) onLogout()
    else setError("No se pudieron enviar todos los cambios. Revísalos en Cambios pendientes o elige otra opción.")
  }

  async function descartarYSalir() {
    const sub = getOutboxUser()
    setBusy("discard")
    if (sub) await clearOutbox(sub).catch(() => undefined)
    setBusy(null)
    onLogout()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent data-slot="logout-pending-dialog">
        <DialogHeader>
          <DialogTitle>Tienes {summary.total} cambios sin sincronizar</DialogTitle>
          <DialogDescription>
            {confirmDiscard
              ? "Los cambios descartados se perderán y no se enviarán al servidor. ¿Seguro?"
              : "Elige qué hacer con ellos antes de cerrar sesión."}
          </DialogDescription>
        </DialogHeader>
        {!confirmDiscard && !shared && (
          <p className="text-muted-foreground text-sm">
            "Salir y conservar": se enviarán la próxima vez que inicies sesión con esta cuenta en este navegador.
          </p>
        )}
        {error && <p className="text-red text-sm">{error}</p>}
        <DialogFooter>
          {confirmDiscard ? (
            <>
              <Button variant="outline" color="neutral" onClick={() => setConfirmDiscard(false)}>
                Volver
              </Button>
              <Button variant="fill" color="destructive" disabled={busy != null} onClick={() => void descartarYSalir()}>
                Descartar y salir
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" color="destructive" disabled={busy != null} onClick={() => setConfirmDiscard(true)}>
                Descartar y salir
              </Button>
              {!shared && (
                <Button variant="outline" color="neutral" disabled={busy != null} onClick={onLogout}>
                  Salir y conservar en este equipo
                </Button>
              )}
              <Button
                variant="fill"
                color="primary"
                disabled={busy != null || offline}
                title={offline ? "Necesitas conexión para esta acción." : undefined}
                onClick={() => void sincronizarYSalir()}
              >
                {busy === "sync" && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
                Sincronizar y salir
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
