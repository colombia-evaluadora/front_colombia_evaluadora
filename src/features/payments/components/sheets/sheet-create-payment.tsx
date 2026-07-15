import { useState } from "react"
import { PlusIcon } from "@phosphor-icons/react"
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

import { useCreatePayment } from "../../api/mutations/create-payment"
import type { PaymentFormValues } from "../../api/schema"
import { CreatePaymentForm } from "../forms/form-create-payment"

const CREATE_PAYMENT_FORM_ID = "create-payment-form"

export function CreatePaymentSheet() {
  const [open, setOpen] = useState(false)

  const createMutation = useCreatePayment({
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
    await createMutation.mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button aria-label="Nuevo pago" />}>
        <PlusIcon data-icon="inline-start" />
        <span className="not-sr-only">Nuevo</span>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false}>
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Nuevo pago</SheetTitle>
          <SheetDescription>
            Completa los datos para crear un nuevo pago.
          </SheetDescription>
        </SheetHeader>
        <CreatePaymentForm id={CREATE_PAYMENT_FORM_ID} onSubmit={handleSubmit} />
        <SheetFooter className="border-t bg-background p-6">
          <Button
            type="submit"
            form={CREATE_PAYMENT_FORM_ID}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
          <SheetClose render={<Button variant="outline" type="button" />}>
            Cancelar
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
