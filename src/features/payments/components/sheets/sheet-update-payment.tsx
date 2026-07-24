import { useState } from "react"

import { PencilIcon } from "@/components/ui/icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { useUpdatePayment } from "../../api/mutations/update-payment"
import type { PaymentFormValues } from "../../api/schema"
import type { Payment } from "../../api/types/payment"
import { UpdatePaymentForm } from "../forms/form-update-payment"

const UPDATE_PAYMENT_FORM_ID = "update-payment-form"

interface UpdatePaymentSheetProps {
  payment: Payment
}

export function UpdatePaymentSheet({ payment }: UpdatePaymentSheetProps) {
  const [open, setOpen] = useState(false)

  const updateMutation = useUpdatePayment({
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

  async function handleSubmit(values: PaymentFormValues) {
    await updateMutation.mutateAsync({
      id: payment.id,
      values,
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="fill"
            color="secondary"
            size="icon"
            className="size-8"
          />
        }
      >
        <span className="sr-only">Editar pago</span>
        <PencilIcon />
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false}>
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Editar pago</SheetTitle>
          <SheetDescription>Actualiza los datos del pago.</SheetDescription>
        </SheetHeader>
        <UpdatePaymentForm
          id={UPDATE_PAYMENT_FORM_ID}
          payment={payment}
          onSubmit={handleSubmit}
        />
        <SheetFooter className="border-t bg-background p-6">
          <Button
            type="submit"
            form={UPDATE_PAYMENT_FORM_ID}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
          <SheetClose render={<Button variant="outline" type="button" />}>
            Cancelar
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
