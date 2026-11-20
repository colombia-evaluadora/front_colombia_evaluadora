import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon, ProhibitIcon } from "@/components/ui/icons"

export interface Bloqueo {
  titulo: string
  /** Puede llevar nombres en negrita (`<strong>`). */
  mensaje: ReactNode
  /** Lista bajo el mensaje (p. ej. los campos que usan la lista). */
  items?: string[]
}

/**
 * Diálogo de bloqueo: ícono rojo junto al título, X para cerrar y un solo botón principal «Entendido».
 * «No se puede inactivar Santander» (S.1.VAL.LST.5) y «No se puede inactivar la lista …» (S.1.LIS.LST.3).
 */
export function DialogBloqueo({ bloqueo, onClose }: { bloqueo: Bloqueo | null; onClose: () => void }) {
  return (
    <Dialog open={bloqueo != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <ProhibitIcon aria-hidden className="size-6 shrink-0 text-red" />
            {bloqueo?.titulo}
          </DialogTitle>
          <DialogDescription className="text-foreground [&_strong]:font-semibold">{bloqueo?.mensaje}</DialogDescription>
        </DialogHeader>
        {bloqueo?.items?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {bloqueo.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button size="sm" color="primary" />}>
            <CheckIcon data-icon="inline-start" />
            Entendido
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
