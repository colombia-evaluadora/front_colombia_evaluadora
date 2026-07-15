import { useState } from "react"

import { TrashIcon } from "@phosphor-icons/react"
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

import { useDeleteAllPayments } from "../../api/mutations/delete-all-payments"
import type { PaymentsQueryRequest } from "../../api/types/payment"

interface DeleteAllPaymentsDialogProps {
  filters: PaymentsQueryRequest["filters"]
}

export function DeleteAllPaymentsDialog({ filters }: DeleteAllPaymentsDialogProps) {
  const [open, setOpen] = useState(false)

  const deleteAll = useDeleteAllPayments({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setOpen(false)
      },
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="destructive"
            aria-label="Eliminar pagos filtrados"
          />
        }
      >
        <TrashIcon />
        <span className="sr-only md:not-sr-only">Eliminar</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar todos los pagos filtrados?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente todos los pagos que
            coincidan con los filtros activos. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteAll.isPending}
            onClick={() => deleteAll.mutate(filters)}
          >
            {deleteAll.isPending ? "Eliminando..." : "Eliminar todo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
