import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import type { MenuActions } from "@/features/administration/roles-menus/api/mutations/set-menu-actions"

interface DialogMenuActionsProps {
  name: string
  initial: MenuActions
  busy: boolean
  onSave: (actions: MenuActions) => void
  onOpenChange: (open: boolean) => void
}

/**
 * Acciones disponibles de una vista (Sección 4.1). Es el tope para todos los
 * roles: sin Guardar, ningún rol puede crear ni editar en ella.
 */
export function DialogMenuActions({ name, initial, busy, onSave, onOpenChange }: DialogMenuActionsProps) {
  const [actions, setActions] = useState(initial)
  const unchanged = actions.guardar === initial.guardar && actions.eliminar === initial.eliminar

  return (
    <Dialog open onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Acciones disponibles</DialogTitle>
          <DialogDescription>
            Qué se puede hacer en «{name}». Lo que se apague aquí no lo tendrá ningún rol, aunque
            lo tenga marcado en Vistas base por rol.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="menu-action-guardar">Guardar (crear y editar)</Label>
            <Switch
          round
              id="menu-action-guardar"
              checked={actions.guardar}
              disabled={busy}
              onCheckedChange={(guardar) => setActions((prev) => ({ ...prev, guardar }))}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="menu-action-eliminar">Eliminar</Label>
            <Switch
          round
              id="menu-action-eliminar"
              checked={actions.eliminar}
              disabled={busy}
              onCheckedChange={(eliminar) => setActions((prev) => ({ ...prev, eliminar }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" disabled={busy || unchanged} aria-busy={busy} onClick={() => onSave(actions)}>
            {busy ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="neutral"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
