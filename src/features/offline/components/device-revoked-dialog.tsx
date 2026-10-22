import { useEffect, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WarningIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { api, hasAuthToken, setAuthToken } from "@/lib/api-client"
import { wipeDeviceData } from "@/lib/offline/device-data"
import { clearRemoteWipeRequest, deviceRevocationStore } from "@/lib/offline/device-revocation"
import { ackWipe } from "@/lib/offline/device-token"
import { syncNow } from "@/lib/offline/outbox/engine"
import { useOutboxSummary } from "@/lib/offline/outbox/hooks"
import { getOutboxUser, setOutboxUser } from "@/lib/offline/outbox/store"
import { queryClient } from "@/lib/query-client"

/**
 * Borrado remoto (D-8): el equipo fue revocado desde "Mis dispositivos" con
 * "Borrar los datos de este equipo". Aviso bloqueante (no se puede cerrar):
 * dice cuántos cambios sin sincronizar se perderían; si todavía hay sesión
 * intenta subirlos antes de borrar. Después borra todo lo del usuario en el
 * equipo, confirma el borrado al servidor y vuelve al login.
 */
export function DeviceRevokedDialog() {
  const revocation = useSyncExternalStore(deviceRevocationStore.subscribe, deviceRevocationStore.get, deviceRevocationStore.get)
  const summary = useOutboxSummary()
  const [busy, setBusy] = useState(false)
  const [paso, setPaso] = useState<"aviso" | "sincronizando" | "borrando">("aviso")
  const sub = revocation?.sub ?? null

  // Los pendientes que se cuentan son los del usuario revocado.
  useEffect(() => {
    if (sub && getOutboxUser() !== sub) void setOutboxUser(sub).catch(() => undefined)
  }, [sub])

  if (!revocation) return null
  const pendientes = summary.total

  async function borrar() {
    if (!sub) return
    setBusy(true)
    try {
      if (pendientes > 0 && hasAuthToken()) {
        setPaso("sincronizando")
        await syncNow().catch(() => undefined)
      }
      setPaso("borrando")
      // El ack necesita el token del equipo: va antes de borrarlo.
      await ackWipe(sub)
      await wipeDeviceData(sub)
      await api.post("/auth/logout").catch(() => undefined)
    } finally {
      setAuthToken(null)
      queryClient.clear()
      clearRemoteWipeRequest()
      setBusy(false)
    }
    window.location.href = paths.auth.login.getHref()
  }

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent data-slot="device-revoked-dialog" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Este equipo fue desconectado de tu cuenta</DialogTitle>
          <DialogDescription>
            Desde "Mis dispositivos" se pidió borrar los datos guardados en este equipo. Se borrarán tus datos para
            trabajar sin conexión, tu PIN y el acceso sin conexión, y tendrás que iniciar sesión de nuevo.
          </DialogDescription>
        </DialogHeader>
        {pendientes > 0 && (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-red-22 px-3 py-2 text-sm text-red">
            <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Tienes {pendientes} {pendientes === 1 ? "cambio" : "cambios"} sin sincronizar.{" "}
              {hasAuthToken()
                ? "Intentaremos enviarlos antes de borrar; lo que no se pueda enviar se perderá."
                : "Sin sesión no se pueden enviar: se perderán al borrar."}
            </span>
          </p>
        )}
        <DialogFooter>
          <Button variant="fill" color="destructive" disabled={busy} onClick={() => void borrar()}>
            {paso === "sincronizando"
              ? "Enviando cambios…"
              : paso === "borrando"
                ? "Borrando…"
                : "Entendido, borrar los datos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
