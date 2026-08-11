import { useState } from "react"
import { toast } from "sonner"

import { PlusIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { useCreateReservation } from "../../api/mutations/create-reservation"
import { useReservationCatalogsQuery } from "../../api/query/use-reservation-catalogs-query"
import type { CreateReservationFormValues } from "../../api/schema"
import { CreateReservationForm } from "../forms/form-create-reservation"

const CREATE_RESERVATION_FORM_ID = "create-reservation-form"

export function CreateReservationSheet() {
  const [open, setOpen] = useState(false)
  const { data: catalogs } = useReservationCatalogsQuery()

  const createReservation = useCreateReservation({
    mutationConfig: {
      onSuccess: (reservation) => {
        toast.success(`Reserva creada para ${reservation.firstName} ${reservation.lastName}.`)
        setOpen(false)
      },
      // El error ya lo tostea el interceptor de axios (incluye el 409 de
      // "ya existe una reserva activa"), así que acá solo dejamos el sheet
      // abierto para que el usuario corrija.
    },
  })

  function handleSubmit(values: CreateReservationFormValues) {
    createReservation.mutate({
      ...values,
      grade: Number(values.grade),
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button color="primary" aria-label="Realizar reserva" />}>
        <PlusIcon data-icon="inline-start" weight="bold" />
        <span className="sr-only md:not-sr-only">Realizar reserva</span>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Realizar reserva</SheetTitle>
          <SheetDescription>
            Registrá la reserva de cupo de un estudiante. Queda en estado pendiente hasta que la
            institución la confirme.
          </SheetDescription>
        </SheetHeader>

        <CreateReservationForm
          id={CREATE_RESERVATION_FORM_ID}
          onSubmit={handleSubmit}
          catalogs={catalogs}
        />

        <SheetFooter className="flex-row items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="submit"
            form={CREATE_RESERVATION_FORM_ID}
            color="primary"
            disabled={createReservation.isPending}
            aria-busy={createReservation.isPending}
          >
            {createReservation.isPending && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            Realizar reserva
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
