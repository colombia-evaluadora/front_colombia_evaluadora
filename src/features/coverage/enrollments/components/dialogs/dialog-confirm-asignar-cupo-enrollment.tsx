import { CheckIcon, XIcon } from "@/components/ui/icons"
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

interface ConfirmAsignarCupoEnrollmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ConfirmAsignarCupoEnrollmentDialog({
  open,
  onOpenChange,
  onConfirm,
}: ConfirmAsignarCupoEnrollmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="sm:text-center sm:place-items-center">
          <DialogTitle>¿Desea asignar un cupo a los estudiantes seleccionados?</DialogTitle>
          <DialogDescription>
            Este procedimiento asignará un cupo, pasando a matrícula con el estado cursando.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            size="sm"
            color="primary"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            <CheckIcon data-icon="inline-start" />
            Confirmar
          </Button>
          <DialogClose render={<Button size="sm" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
