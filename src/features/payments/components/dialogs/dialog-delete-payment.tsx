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

import { useDeletePayment } from "../../api/mutations/delete-payment"
import type { Payment } from "../../api/types/payment"

interface DeletePaymentDialogProps {
  payment: Payment
}

export function DeletePaymentDialog({ payment }: DeletePaymentDialogProps) {
  const [open, setOpen] = useState(false)

  const deleteMutation = useDeletePayment({
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
            variant="outline"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
          />
        }
      >
        <span className="sr-only">Eliminar pago</span>
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente el pago de {payment.email}. Esta
            acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(payment.id)}
          >
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
