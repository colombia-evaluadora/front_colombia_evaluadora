import { useState } from "react"

import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"
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
            variant="fill"
            color="destructive"
            size="sm"
            aria-label={`Eliminar ${count} seleccionados`}
          />
        }
      >
        <TrashIcon data-icon="inline-start" />
        <span aria-hidden="true" className="md:hidden">
          ({count})
        </span>
        <span className="sr-only md:not-sr-only">Eliminar ({count})</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente {count} pago(s) seleccionado(s). Esta acción no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            color="destructive"
            disabled={deleteSelected.isPending}
            aria-busy={deleteSelected.isPending}
            onClick={() => deleteSelected.mutate(selectedIds)}
          >
            {/* El spinner reemplaza al icono en vez de sumarse: así el ancho
                del botón no salta al entrar en loading. */}
            {deleteSelected.isPending ? (
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
