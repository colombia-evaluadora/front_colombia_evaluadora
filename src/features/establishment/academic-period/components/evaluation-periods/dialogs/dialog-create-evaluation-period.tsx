import { useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"
import { CheckIcon, ControlPointIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCreateEvaluationPeriod } from "../../../api/mutations/evaluation-periods/create-evaluation-period"
import { useUpdateEvaluationPeriod } from "../../../api/mutations/evaluation-periods/update-evaluation-period"
import { useEvaluationPeriodsQuery } from "../../../api/query/evaluation-periods/use-evaluation-periods-query"
import { useEvaluationPeriodStatusesQuery } from "../../../api/query/evaluation-periods/use-evaluation-period-statuses-query"
import { useAcademicPeriodQuery } from "../../../api/query/academic-period/use-academic-period-query"
import type { EvaluationPeriod, EvaluationPeriodStatus } from "../../../api/types/evaluation-period"
import { DatePicker } from "@/components/date-picker"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { EVALUATION_PERIOD_STATUS_BADGE } from "../../../api/ui-mappings"
import { evaluationPeriodFormSchema, type EvaluationPeriodFormValues } from "../../../api/schema"

const EMPTY: EvaluationPeriodFormValues = {
  codigo: 0,
  nombre: "",
  abreviacion: "",
  startDate: "",
  endDate: "",
  peso: 0,
  estado: "NO Calificable",
}

const FORM_ID = "evaluation-period-form"

interface CreateEvaluationPeriodDialogProps {
  academicPeriodId?: number
  period?: EvaluationPeriod
}

export function CreateEvaluationPeriodDialog({
  academicPeriodId,
  period,
}: CreateEvaluationPeriodDialogProps) {
  const isEditing = period != null
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const { data: periodsData } = useEvaluationPeriodsQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    academicPeriodId,
  })
  const otherPeriods = (periodsData?.rows ?? []).filter(
    (p) => period == null || p.codigo !== period.codigo,
  )
  const pesoUsado = otherPeriods.reduce((sum, p) => sum + (p.peso ?? 0), 0)
  const pesoDisponible = Math.max(0, 100 - pesoUsado)

  const { data: statusOptions = [] } = useEvaluationPeriodStatusesQuery()

  // Fechas del periodo académico: se usan para limitar (no solo avisar)
  // el rango del periodo de evaluación que se está creando/editando.
  const { data: academicPeriod } = useAcademicPeriodQuery(academicPeriodId)
  const academicPeriodStart = academicPeriod?.startDate ?? ""
  const academicPeriodEnd = academicPeriod?.endDate ?? ""

  function hasOverlap(start: string, end: string): boolean {
    if (!start || !end) return false
    return otherPeriods.some((p) => start <= p.endDate && p.startDate <= end)
  }

  const defaultValues: EvaluationPeriodFormValues = period
    ? {
        codigo: period.codigo,
        nombre: period.nombre,
        abreviacion: period.abreviacion,
        startDate: period.startDate,
        endDate: period.endDate,
        peso: period.peso,
        estado: period.estado,
      }
    : EMPTY

  const createEvaluation = useCreateEvaluationPeriod({
    mutationConfig: {
      onSuccess: () => {
        form.reset()
        setOpen(false)
        notify(SUCCESS_MESSAGES.evaluationPeriod.created)
      },
    },
  })

  const updateEvaluation = useUpdateEvaluationPeriod({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        setOpen(false)
        notify(SUCCESS_MESSAGES.evaluationPeriod.updated)
      },
    },
  })

  const isSaving = createEvaluation.isPending || updateEvaluation.isPending

  const form = useForm({
    defaultValues,
    validators: {
      onChange: evaluationPeriodFormSchema,
      onSubmit: evaluationPeriodFormSchema,
    },
    onSubmit: ({ value }) => {
      const values = evaluationPeriodFormSchema.parse(value)
      if (hasOverlap(values.startDate, values.endDate)) {
        notify("El período coincide con otro período de evaluación existente. Revisa las fechas.", {
          variant: "error",
        })
        return
      }
      if (values.peso > pesoDisponible) {
        notify(`El peso porcentual supera el 100 %. Disponible: ${pesoDisponible} %.`, {
          variant: "error",
        })
        return
      }
      const payload = { ...values, estado: values.estado as EvaluationPeriodStatus }
      if (isEditing) {
        updateEvaluation.mutate({
          academicPeriodId,
          codigo: period.codigo,
          values: payload,
        })
      } else {
        createEvaluation.mutate({ ...payload, academicPeriodId })
      }
    },
  })

  function handleOpenChange(next: boolean) {
    if (next) form.reset(defaultValues)
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="fill" color="secondary" size="icon" className="size-8" />
          ) : (
            <Button color="primary" size="sm" />
          )
        }
      >
        {isEditing ? (
          <>
            <span className="sr-only">Editar periodo de evaluación</span>
            <PencilIcon />
          </>
        ) : (
          <>
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar periodo de evaluación" : "Agregar periodo de evaluación"}
          </DialogTitle>
          <DialogDescription>Completa los datos del periodo de evaluación.</DialogDescription>
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
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Código*</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={1}
                    placeholder="Ingresar código"
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
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Nombre*</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="Ingresar nombre"
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
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Abreviación*</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="Ingresar abreviación"
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

          <form.Field
            name="startDate"
            validators={{
              onChange: ({ value }) => {
                if (!value) return undefined
                if (academicPeriodStart && value < academicPeriodStart) {
                  return {
                    message:
                      "La fecha de inicio no puede ser anterior a la fecha de inicio del período académico.",
                  }
                }
                if (academicPeriodEnd && value > academicPeriodEnd) {
                  return {
                    message:
                      "La fecha de inicio no puede ser posterior a la fecha de fin del período académico.",
                  }
                }
                return undefined
              },
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <form.Subscribe selector={(state) => state.values.endDate}>
                  {(endDate) => {
                    const outOfRange =
                      !!field.state.value && !!endDate && field.state.value >= endDate
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Fecha inicio*</FieldLabel>
                        <DatePicker
                          mode="date"
                          id={field.name}
                          value={parseDateValue(field.state.value)}
                          onChange={(date) => {
                            field.handleChange(formatDateValue(date))
                            field.handleBlur()
                          }}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : outOfRange ? (
                          <p role="alert" className="text-muted-foreground text-xs">
                            La fecha de inicio debe ser anterior a la fecha de fin del período de
                            evaluación.
                          </p>
                        ) : null}
                      </Field>
                    )
                  }}
                </form.Subscribe>
              )
            }}
          </form.Field>

          <form.Field
            name="endDate"
            validators={{
              onChange: ({ value }) => {
                if (!value) return undefined
                if (academicPeriodStart && value < academicPeriodStart) {
                  return {
                    message:
                      "La fecha de fin no puede ser anterior a la fecha de inicio del período académico.",
                  }
                }
                if (academicPeriodEnd && value > academicPeriodEnd) {
                  return {
                    message:
                      "La fecha de fin no puede ser posterior a la fecha de fin del período académico.",
                  }
                }
                return undefined
              },
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Fecha fin*</FieldLabel>
                  <DatePicker
                    mode="date"
                    id={field.name}
                    value={parseDateValue(field.state.value)}
                    onChange={(date) => {
                      field.handleChange(formatDateValue(date))
                      field.handleBlur()
                    }}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field
            name="peso"
            validators={{
              onChange: ({ value }) =>
                value > pesoDisponible
                  ? {
                      message: `El peso supera el 100 %. Disponible: ${pesoDisponible} %.`,
                    }
                  : undefined,
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Peso porcentual (%)*</FieldLabel>
                  {/* El sufijo "%" hace explícita la unidad del valor, que de
                      otro modo se lee como un número suelto. */}
                  <InputGroup className="h-10 rounded-md border border-input px-3 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
                    <InputGroupInput
                      id={field.name}
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Ingresar peso porcentual"
                      className="px-0"
                      value={Number.isNaN(field.state.value) ? "" : field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="estado">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Estado*</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      value && field.handleChange(value as EvaluationPeriodStatus)
                    }
                  >
                    <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                      {/* El valor elegido se muestra como el mismo badge soft
                          que usa la columna Estado de la tabla. */}
                      <SelectValue>
                        {(value) => {
                          const estado = value as EvaluationPeriodStatus
                          const badge = EVALUATION_PERIOD_STATUS_BADGE[estado]
                          if (!badge) return "Seleccionar"
                          const label =
                            statusOptions.find((option) => option.key === estado)?.label ?? estado
                          return <Badge {...badge}>{label}</Badge>
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>
        </form>

        {/* Ambas acciones a la derecha; "Cancelar" va última y sólida en
            neutral, para que el peso visual no compita con el envío. */}
        <DialogFooter>
          <form.Subscribe selector={(state) => state.values}>
            {(values) => {
              const allRequiredFilled =
                Number(values.codigo) > 0 &&
                values.nombre.trim().length > 0 &&
                values.abreviacion.trim().length > 0 &&
                values.startDate.length > 0 &&
                values.endDate.length > 0 &&
                !Number.isNaN(values.peso) &&
                values.estado.length > 0
              // Las fechas deben caer dentro del rango del periodo académico
              // (cuando este existe). Si no, se deshabilita el submit además
              // del FieldError que muestra el form al tocar el campo.
              const datesWithinAcademicPeriod =
                (!academicPeriodStart || values.startDate >= academicPeriodStart) &&
                (!academicPeriodEnd || values.startDate <= academicPeriodEnd) &&
                (!academicPeriodStart || values.endDate >= academicPeriodStart) &&
                (!academicPeriodEnd || values.endDate <= academicPeriodEnd)
              return (
                <Button
                  type="submit"
                  color="primary"
                  form={FORM_ID}
                  disabled={isSaving || !allRequiredFilled || !datesWithinAcademicPeriod}
                  aria-busy={isSaving}
                >
                  {isSaving ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <CheckIcon data-icon="inline-start" />
                  )}
                  Guardar
                </Button>
              )
            }}
          </form.Subscribe>
          <DialogClose render={<Button type="button" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
