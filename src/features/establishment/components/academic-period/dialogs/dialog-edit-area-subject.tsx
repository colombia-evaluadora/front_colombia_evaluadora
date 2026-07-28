import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PencilIcon, SpinnerIcon } from "@/components/ui/icons"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useUpdateAreaSubject } from "../../../api/mutations/update-area-subject"
import { useGeneralAreasQuery } from "../../../api/query/use-general-areas-query"
import type { AreaSubject } from "../../../api/types/academic-period/area-subject"
import { ColorPickerPopover } from "../color-picker"

const editAreaSubjectFormSchema = z.object({
  nombreInterno: z.string().min(1, "La asignatura es obligatoria"),
  abreviacion: z.string().min(1, "La abreviación es obligatoria"),
  ordenReportes: z.number().int().nonnegative(),
})
type EditAreaSubjectFormValues = z.infer<typeof editAreaSubjectFormSchema>

const FORM_ID = "edit-area-subject-form"

interface EditAreaSubjectDialogProps {
  areaSubject: AreaSubject
}

export function EditAreaSubjectDialog({ areaSubject }: EditAreaSubjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState(areaSubject.color ?? "")

  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const asignaturas =
    generalAreas.find((a) => a.nombre === areaSubject.areaGeneral)?.asignaturas ??
    []

  const updateAreaSubject = useUpdateAreaSubject({
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

  const form = useForm({
    defaultValues: {
      nombreInterno: areaSubject.nombreInterno,
      abreviacion: areaSubject.abreviacion,
      ordenReportes: areaSubject.ordenReportes,
    } as EditAreaSubjectFormValues,
    validators: { onSubmit: editAreaSubjectFormSchema },
    onSubmit: ({ value }) => {
      const values = editAreaSubjectFormSchema.parse(value)
      updateAreaSubject.mutate({
        codigo: areaSubject.codigo,
        values: {
          ...areaSubject,
          ...values,
          color: color || undefined,
        },
      })
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      form.reset()
      setColor(areaSubject.color ?? "")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="fill" color="secondary" size="icon" className="size-8" />}
      >
        <span className="sr-only">Editar área/asignatura</span>
        <PencilIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar área/asignatura</DialogTitle>
          <DialogDescription>Actualizá los datos del área/asignatura.</DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
        >
          <Field variant="outlined">
            <FieldLabel htmlFor="edit-area-general">Área general</FieldLabel>
            <Input
              id="edit-area-general"
              value={areaSubject.areaGeneral}
              readOnly
              disabled
            />
          </Field>

          <form.Field name="nombreInterno">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Asignatura*</FieldLabel>
                  <Select
                    value={field.state.value || undefined}
                    onValueChange={(value) => value && field.handleChange(value)}
                  >
                    <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {asignaturas.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            El área general no tiene asignaturas cargadas.
                          </div>
                        ) : (
                          asignaturas.map((asignatura) => (
                            <SelectItem key={asignatura} value={asignatura}>
                              {asignatura}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="abreviacion">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Abreviación*</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="ej. MAT"
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
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Orden en los reportes*</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    placeholder="ej. 1"
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

          <Field>
            <FieldLabel>Color</FieldLabel>
            <ColorPickerPopover value={color} onChange={setColor} />
          </Field>
        </form>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={updateAreaSubject.isPending}
            aria-busy={updateAreaSubject.isPending}
          >
            {updateAreaSubject.isPending && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
