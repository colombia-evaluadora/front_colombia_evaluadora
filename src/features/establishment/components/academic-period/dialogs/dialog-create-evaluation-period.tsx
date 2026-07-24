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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCreateEvaluationPeriod } from "../../../api/mutations/create-evaluation-period"
import { EVALUATION_PERIOD_STATUSES } from "../../../api/ui-mappings"
import type { EvaluationPeriodStatus } from "../../../api/types/academic-period/evaluation-period"
import { FieldDatePopover } from "../field-date-popover"

const STATUS_TUPLE = [
  "No iniciado",
  "En curso",
  "Cargado",
  "Habilitado",
] as const satisfies readonly EvaluationPeriodStatus[]

const evaluationPeriodFormSchema = z.object({
  codigo: z.number().int().positive("El código es obligatorio"),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  abreviacion: z.string().min(1, "La abreviación es obligatoria"),
  startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
  endDate: z.string().min(1, "La fecha de fin es obligatoria"),
  peso: z.number().min(0).max(100),
  estado: z.enum(STATUS_TUPLE),
})
type EvaluationPeriodFormValues = z.infer<typeof evaluationPeriodFormSchema>

const EMPTY: EvaluationPeriodFormValues = {
  codigo: 0,
  nombre: "",
  abreviacion: "",
  startDate: "",
  endDate: "",
  peso: 0,
  estado: "No iniciado",
}

const FORM_ID = "evaluation-period-form"

export function CreateEvaluationPeriodDialog() {
  const [open, setOpen] = useState(false)

  const createEvaluation = useCreateEvaluationPeriod({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Periodo de evaluación creado.")
        form.reset()
        setOpen(false)
      },
    },
  })

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onSubmit: evaluationPeriodFormSchema },
    onSubmit: ({ value }) => {
      createEvaluation.mutate(evaluationPeriodFormSchema.parse(value))
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button color="primary" size="sm" />}>
        <PlusCircleIcon weight="fill" data-icon="inline-start" />
        Agregar
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agregar periodo de evaluación</DialogTitle>
          <DialogDescription>
            Completá los datos del periodo de evaluación.
          </DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-4 sm:grid-cols-3"
        >
          <form.Field name="codigo">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Código</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={1}
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

          <form.Field name="nombre">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
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
                    placeholder="ej. PE1"
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

          <form.Field name="peso">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Peso porcentual</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    max={100}
                    placeholder="ej. 25"
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

          <form.Field name="startDate">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Fecha inicio</FieldLabel>
                  <FieldDatePopover
                    id={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="endDate">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Fecha fin</FieldLabel>
                  <FieldDatePopover
                    id={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="estado">
            {(field) => (
              <Field className="sm:col-span-3">
                <FieldLabel htmlFor={field.name}>Estado</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    value && field.handleChange(value as EvaluationPeriodStatus)
                  }
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {EVALUATION_PERIOD_STATUSES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
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
            disabled={createEvaluation.isPending}
            aria-busy={createEvaluation.isPending}
          >
            {createEvaluation.isPending && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
