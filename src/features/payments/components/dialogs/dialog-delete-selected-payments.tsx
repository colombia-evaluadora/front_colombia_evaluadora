import { useState } from "react"

import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

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

import { useDeleteSelectedPayments } from "../../api/mutations/delete-selected-payments"

interface DeleteSelectedPaymentsDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function DeleteSelectedPaymentsDialog({
  selectedIds,
  resetSelection,
}: DeleteSelectedPaymentsDialogProps) {
  const [open, setOpen] = useState(false)
  const count = selectedIds.length

  const deleteSelected = useDeleteSelectedPayments({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setOpen(false)
        resetSelection()
      },
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="destructive"
            aria-label={`Eliminar ${count} seleccionados`}
          />
        }
      >
        <Trash2Icon data-icon="inline-start" />
        <span aria-hidden="true" className="md:hidden">
          ({count})
        </span>
        <span className="sr-only md:not-sr-only">
          Eliminar ({count})
        </span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar los pagos seleccionados?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente {count} pago(s) seleccionado(s).
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteSelected.isPending}
            onClick={() => deleteSelected.mutate(selectedIds)}
          >
            {deleteSelected.isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
