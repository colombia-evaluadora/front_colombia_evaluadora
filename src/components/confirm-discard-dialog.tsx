import { CheckIcon, XIcon } from "@/components/ui/icons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDiscardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  /** Textos para otros contextos (p. ej. cambiar de pestaña en vez de salir). */
  title?: string
  description?: string
  confirmLabel?: string
}

// Confirmación reusada por los diálogos de alta/edición del sistema al
// cerrarse con cambios sin guardar (Cancelar, "X", overlay o Escape).
export function ConfirmDiscardDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "¿Estás seguro de salir?",
  description = "Perderás los cambios no guardados.",
  confirmLabel = "Si, salir",
}: ConfirmDiscardDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction color="destructive" onClick={onConfirm}>
            <CheckIcon data-icon="inline-start" />
            {confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral">
            <XIcon data-icon="inline-start" />
            Continuar editando
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
