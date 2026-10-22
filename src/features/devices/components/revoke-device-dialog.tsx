import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Device } from "@/features/devices/api/types/device"

/**
 * Confirmación de "Revocar". Con "Borrar los datos..." el equipo, al
 * conectarse, borra lo guardado para trabajar sin conexión (borrado remoto).
 */
export function RevokeDeviceDialog({
  device,
  onClose,
  onConfirm,
  pending,
  error,
}: {
  device: Device | null
  onClose: () => void
  onConfirm: (wipe: boolean) => void
  pending: boolean
  error: string | null
}) {
  const [wipe, setWipe] = useState(false)
  const nombre = device?.label || "este equipo"

  return (
    <Dialog
      open={device != null}
      onOpenChange={(open) => {
        if (!open && !pending) {
          setWipe(false)
          onClose()
        }
      }}
    >
      <DialogContent data-slot="revoke-device-dialog">
        <DialogHeader>
          <DialogTitle>Revocar {nombre}</DialogTitle>
          <DialogDescription>
            El equipo dejará de sincronizar a tu nombre sin contraseña. Para volver a usarlo sin conexión habrá que
            iniciar sesión en él y registrarlo de nuevo.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={wipe}
            onCheckedChange={(checked) => setWipe(checked === true)}
            aria-label="Borrar los datos de este equipo al conectarse"
          />
          <span>
            Borrar los datos de este equipo al conectarse
            <span className="block text-xs text-muted-foreground">
              Úsalo si el equipo se perdió o lo robaron. Los cambios que no se hayan sincronizado se perderán.
            </span>
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-md bg-red-22 px-3 py-2 text-sm text-red">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="fill" color="destructive" disabled={pending} onClick={() => onConfirm(wipe)}>
            {pending ? "Revocando…" : "Revocar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
