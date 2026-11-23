import { useState, type ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"

interface ConfirmRemoveButtonProps {
  description: ReactNode
  label: string
  title?: string
  onConfirm: () => void | boolean | Promise<void | boolean>
  disabled?: boolean
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}


export function ConfirmRemoveButton({
  description,
  label,
  title = "Eliminar",
  onConfirm,
  disabled,
  size = "icon-sm",
  className,
}: ConfirmRemoveButtonProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      const result = await onConfirm()
      if (result !== false) setOpen(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {/* Como las demás acciones de fila: solo ícono con tooltip; Eliminar en rojo, también en hover. */}
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="destructive"
                size={size}
                disabled={disabled}
                className={className}
              />
            }
          >
            <span className="sr-only">{label}</span>
            <TrashIcon />
          </AlertDialogTrigger>
        </TooltipTrigger>
        {/* Texto corto como los demás iconos de fila; el nombre completo queda en `label` (lectores de pantalla). */}
        <TooltipContent>Eliminar</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" color="neutral" disabled={pending}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            color="destructive"
            onClick={handleConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
