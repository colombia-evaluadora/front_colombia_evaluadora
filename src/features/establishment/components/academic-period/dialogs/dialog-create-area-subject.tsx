import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PlusCircleIcon, SpinnerIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useCreateAreaSubject } from "../../../api/mutations/create-area-subject"

const areaSubjectFormSchema = z.object({
  codigo: z.number().int().positive("El código es obligatorio"),
  areaGeneral: z.string().min(1, "El área general es obligatoria"),
  nombreInterno: z.string().min(1, "El nombre interno es obligatorio"),
  abreviacion: z.string().min(1, "La abreviación es obligatoria"),
  ordenReportes: z.number().int().nonnegative(),
})
type AreaSubjectFormValues = z.infer<typeof areaSubjectFormSchema>

const EMPTY: AreaSubjectFormValues = {
  codigo: 0,
  areaGeneral: "",
  nombreInterno: "",
  abreviacion: "",
  ordenReportes: 0,
}

const FORM_ID = "area-subject-form"

export function CreateAreaSubjectDialog() {
  const [open, setOpen] = useState(false)

  const createAreaSubject = useCreateAreaSubject({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Área/asignatura creada.")
        form.reset()
        setOpen(false)
      },
    },
  })

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onSubmit: areaSubjectFormSchema },
    onSubmit: ({ value }) => {
      createAreaSubject.mutate(areaSubjectFormSchema.parse(value))
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button color="primary" size="sm" />}>
        <PlusCircleIcon weight="fill" data-icon="inline-start" />
        Agregar
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar área/asignatura</DialogTitle>
          <DialogDescription>
            Completá los datos del área o asignatura.
          </DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-4 sm:grid-cols-2"
        >
          <form.Field name="areaGeneral">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Área general</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="nombreInterno">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Nombre interno</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="abreviacion">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Abreviación</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="ordenReportes">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid} className="sm:col-span-2">
                  <FieldLabel htmlFor={field.name}>Orden de reportes</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>
        </form>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <Button
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={createAreaSubject.isPending}
            aria-busy={createAreaSubject.isPending}
          >
            {createAreaSubject.isPending && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
