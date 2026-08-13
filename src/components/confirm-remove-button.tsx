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
import { CheckIcon, TrashIcon, XIcon } from "@/components/ui/icons"

interface ConfirmRemoveButtonProps {
  /** Qué se está por quitar. Va en el cuerpo del aviso. */
  description: ReactNode
  /** Texto accesible del botón de la papelera (`Quitar descanso 2`, etc.). */
  label: string
  /** Encabezado del aviso. Por defecto, el mismo que usan los diálogos de borrado. */
  title?: string
  onConfirm: () => void
  disabled?: boolean
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}

/**
 * Papelera con confirmación para las filas que solo viven en el borrador de un
 * formulario (permisos, descansos, submenús...). Esas filas no pasan por una
 * mutación, así que no tenían un `dialog-delete-*` propio y se borraban de un
 * clic; acá se les da el mismo paso intermedio que a los borrados del backend.
 *
 * El borrado es síncrono: no hay estado de carga, se cierra apenas confirma.
 */
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

  function handleConfirm() {
    onConfirm()
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size={size}
            disabled={disabled}
            className={className}
          />
        }
      >
        <span className="sr-only">{label}</span>
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction color="destructive" onClick={handleConfirm}>
            <CheckIcon data-icon="inline-start" />
            Si
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral">
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
