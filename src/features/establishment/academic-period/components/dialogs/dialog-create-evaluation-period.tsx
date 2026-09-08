import { useRef, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"
import { CheckIcon, ControlPointIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { getErrorMessage } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
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

import { useCreateEvaluationPeriod } from "@/features/establishment/academic-period/api/mutations/create-evaluation-period"
import { useUpdateEvaluationPeriod } from "@/features/establishment/academic-period/api/mutations/update-evaluation-period"
import { useEvaluationPeriodStatusesQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-period-statuses"
import { useEvaluationPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-periods"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"
import { DatePicker } from "@/components/date-picker"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { EVALUATION_PERIOD_STATUS_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import {
  evaluationPeriodFormSchema,
  type EvaluationPeriodFormValues,
} from "@/features/establishment/academic-period/api/schema"

const EMPTY: EvaluationPeriodFormValues = {
  codigo: "",
  nombre: "",
  abreviacion: "",
  startDate: "",
  endDate: "",
  peso: 0,
  estadoId: 0,
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

  const [notice, setNotice] = useState<{
    id: number
    message: string
    variant: NoticeVariant
  } | null>(null)
  const noticeIdRef = useRef(0)

  function notifyInDialog(message: string, options?: { variant?: NoticeVariant }) {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant: options?.variant ?? "error" })
  }

  const { data: statusOptions = [] } = useEvaluationPeriodStatusesQuery()

  const { data: academicPeriod } = useAcademicPeriodQuery(academicPeriodId)
  const academicPeriodStart = academicPeriod?.startDate ?? ""
  const academicPeriodEnd = academicPeriod?.endDate ?? ""
  const { data: allPeriodsData } = useEvaluationPeriodsQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 1000,
    academicPeriodId,
    enabled: open,
  })
  const otherPeriodsWeightSum = (allPeriodsData?.rows ?? [])
    .filter((row) => !isEditing || row.id !== period.id)
    .reduce((sum, row) => sum + (row.peso ?? 0), 0)
  const maxAllowedWeight = Math.max(0, 100 - otherPeriodsWeightSum)

  const defaultValues: EvaluationPeriodFormValues = period
    ? {
        codigo: period.codigo,
        nombre: period.nombre,
        abreviacion: period.abreviacion,
        startDate: period.startDate,
        endDate: period.endDate,
        peso: period.peso,
        estadoId: period.estadoId ?? 0,
      }
    : EMPTY

  const createEvaluation = useCreateEvaluationPeriod({
    mutationConfig: {
      onSuccess: () => {
        form.reset()
        setOpen(false)
        notify(SUCCESS_MESSAGES.evaluationPeriod.created)
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error))
      },
    },
  })

  const updateEvaluation = useUpdateEvaluationPeriod({
    mutationConfig: {
      onSuccess: () => {
        setOpen(false)
        notify(SUCCESS_MESSAGES.evaluationPeriod.updated)
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error))
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
      const payload = { ...values }
      if (isEditing) {
        updateEvaluation.mutate({
          academicPeriodId,
          id: period.id,
          values: payload,
        })
      } else {
        createEvaluation.mutate({ ...payload, academicPeriodId })
      }
    },
  })

  function handleOpenChange(next: boolean) {
    if (next) form.reset(defaultValues)
    setNotice(null)
    setOpen(next)
  }

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  function requestClose() {
    if (isSaving) return
    if (JSON.stringify(form.state.values) !== JSON.stringify(defaultValues)) {
      setConfirmDiscardOpen(true)
      return
    }
    handleOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) handleOpenChange(true)
        else requestClose()
      }}
    >
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="ghost" color="neutral" size="icon-sm" />
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
            {isEditing ? "Editar periodo de evaluación" : "Agregar periodos de evaluación"}
          </DialogTitle>
        </DialogHeader>

        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? undefined : 4000}
        />

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
                    type="text"
                    maxLength={30}
                    placeholder="Agregar"
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

          <form.Field name="nombre">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Nombre*</FieldLabel>
                  <Input
                    id={field.name}
                    maxLength={130}
                    placeholder="Agregar"
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
                    maxLength={30}
                    placeholder="Agregar"
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
              onChange: ({ value }) => {
                if (Number.isNaN(value)) return undefined
                if (value > maxAllowedWeight) {
                  return {
                    message: `La suma de los pesos no puede superar el 100%. Disponible: ${maxAllowedWeight}%.`,
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
                  <FieldLabel htmlFor={field.name}>Peso porcentual (%)*</FieldLabel>
                  {/* El sufijo "%" hace explícita la unidad del valor, que de
                      otro modo se lee como un número suelto. */}
                  <InputGroup className="h-11 rounded-md border border-input px-3 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
                    <InputGroupInput
                      id={field.name}
                      type="number"
                      min={0}
                      max={maxAllowedWeight}
                      step={1}
                      placeholder="Agregar"
                      className="px-0"
                      value={Number.isNaN(field.state.value) ? "" : field.state.value}
                      onBlur={field.handleBlur}
                      onKeyDown={(e) => {
                        if (["-", "+", ".", ",", "e", "E"].includes(e.key)) {
                          e.preventDefault()
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.valueAsNumber
                        if (e.target.value === "" || !Number.isNaN(value)) {
                          field.handleChange(value)
                        }
                      }}
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : (
                    <p className="text-muted-foreground text-xs"></p>
                  )}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="estadoId">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Estado*</FieldLabel>
                  <Select
                    value={field.state.value ? String(field.state.value) : ""}
                    onValueChange={(value) =>
                      value && field.handleChange(Number(value))
                    }
                  >
                    <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                      {/* El valor elegido se muestra como el mismo badge soft
                          que usa la columna Estado de la tabla. Se resuelve por id. */}
                      <SelectValue>
                        {(value) => {
                          const option = statusOptions.find(
                            (o) => String(o.id) === value
                          )
                          if (!option) return "Seleccionar"
                          const badge = EVALUATION_PERIOD_STATUS_BADGE[option.key]
                          return (
                            <Badge {...badge} className="text-xs">
                              {option.label}
                            </Badge>
                          )
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {statusOptions.map((option) => (
                          <SelectItem
                            key={option.id}
                            value={String(option.id)}
                            title={option.label}
                          >
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
        <DialogFooter>
          <form.Subscribe selector={(state) => state.values}>
            {(values) => {
              const allRequiredFilled =
                values.codigo.trim().length > 0 &&
                values.nombre.trim().length > 0 &&
                values.abreviacion.trim().length > 0 &&
                values.startDate.length > 0 &&
                values.endDate.length > 0 &&
                !Number.isNaN(values.peso) &&
                values.peso <= maxAllowedWeight &&
                values.estadoId > 0
              const datesWithinAcademicPeriod =
                (!academicPeriodStart || values.startDate >= academicPeriodStart) &&
                (!academicPeriodEnd || values.startDate <= academicPeriodEnd) &&
                (!academicPeriodStart || values.endDate >= academicPeriodStart) &&
                (!academicPeriodEnd || values.endDate <= academicPeriodEnd)
              return (
                <Button
                  size="sm"
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
          <Button size="sm" type="button" variant="fill" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          handleOpenChange(false)
        }}
      />
    </Dialog>
  )
}
