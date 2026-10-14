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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { CheckIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { toDigitsOnly } from "@/lib/text-input"

interface DialogMoveMenuProps {
  name: string
  /** Posición actual, contando desde 1. */
  current: number
  total: number
  onMove: (position: number) => void
  onOpenChange: (open: boolean) => void
}

/**
 * Lleva una vista a una posición dentro de su módulo de una sola vez: con
 * Subir/Bajar, pasar de la 24 a la 5 eran 19 clics.
 */
export function DialogMoveMenu({ name, current, total, onMove, onOpenChange }: DialogMoveMenuProps) {
  const [value, setValue] = useState(String(current))
  const position = Number(value)
  const invalid = value === "" || position < 1 || position > total

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (invalid) return
    if (position !== current) onMove(position)
    onOpenChange(false)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mover a posición</DialogTitle>
          <DialogDescription>
            «{name}» está en la posición {current} de {total}. Las demás se corren para hacerle lugar.
          </DialogDescription>
        </DialogHeader>
        <form id="move-menu-form" onSubmit={submit}>
          <Field variant="outlined" data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="move-menu-position">Nueva posición</FieldLabel>
            <Input
              id="move-menu-position"
              inputMode="numeric"
              autoFocus
              value={value}
              aria-invalid={invalid}
              onChange={(event) => setValue(toDigitsOnly(event.target.value, 3))}
            />
            {invalid ? (
              <FieldError>Escribe un número entre 1 y {total}.</FieldError>
            ) : (
              <FieldDescription>Entre 1 y {total}.</FieldDescription>
            )}
          </Field>
        </form>
        <DialogFooter>
          <Button type="submit" form="move-menu-form" disabled={invalid}>
            <CheckIcon data-icon="inline-start" />
            Mover
          </Button>
          <Button type="button" variant="fill" color="neutral" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
