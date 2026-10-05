import { useEffect, useRef, useState } from "react"
import { addDays } from "date-fns"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useAppForm } from "@/lib/forms"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { useCreateEvaluationPeriod } from "@/features/establishment/academic-period/api/mutations/create-evaluation-period"
import { useUpdateEvaluationPeriod } from "@/features/establishment/academic-period/api/mutations/update-evaluation-period"
import { useEvaluationPeriodStatusesQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-period-statuses"
import { useEvaluationPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-periods"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"
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
  const statusSelectOptions = statusOptions.map((o) => ({ value: o.id, label: o.label }))

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
  const otherPeriods = (allPeriodsData?.rows ?? []).filter(
    (row) => !isEditing || row.id !== period.id,
  )
  const otherPeriodsWeightSum = otherPeriods.reduce((sum, row) => sum + (row.peso ?? 0), 0)
  const maxAllowedWeight = Math.max(0, 100 - otherPeriodsWeightSum)

  function dateWithinOtherPeriod(date: string): boolean {
    return otherPeriods.some((p) => date >= p.startDate && date <= p.endDate)
  }

  function rangeOverlapsOtherPeriod(start: string, end: string): boolean {
    return otherPeriods.some((p) => start <= p.endDate && p.startDate <= end)
  }

  function nextOtherPeriodStart(start: string): string | undefined {
    return otherPeriods
      .map((p) => p.startDate)
      .filter((s) => s > start)
      .sort()[0]
  }

  function hasAvailableEndDate(startDateValue: string): boolean {
    if (!startDateValue) return true
    const dayAfterStart = formatDateValue(addDays(parseDateValue(startDateValue) as Date, 1))
    const nextStart = nextOtherPeriodStart(startDateValue)
    const maxEnd = nextStart
      ? formatDateValue(addDays(parseDateValue(nextStart) as Date, -1))
      : academicPeriodEnd
    return !maxEnd || dayAfterStart <= maxEnd
  }

  const otherPeriodsDateRanges = otherPeriods.map((p) => ({
    from: parseDateValue(p.startDate) as Date,
    to: parseDateValue(p.endDate) as Date,
  }))
  const academicPeriodMinDate = parseDateValue(academicPeriodStart)
  const academicPeriodMaxDate = parseDateValue(academicPeriodEnd)

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

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: evaluationPeriodFormSchema,
      onSubmit: evaluationPeriodFormSchema,
    },
    // `onSubmit` solo corre si el validador de submit pasó: no hace falta
    // volver a parsear (el schema no transforma valores).
    onSubmit: ({ value }) => {
      const payload = { ...value }
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

  useEffect(() => {
    if (isEditing || !open || form.state.values.estadoId) return
    const noCalificable = statusOptions.find((o) => o.key === "2")
    if (noCalificable) form.setFieldValue("estadoId", noCalificable.id)
  }, [isEditing, open, statusOptions, form])

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
      {isEditing ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
            }
          >
            <span className="sr-only">Editar periodo de evaluación</span>
            <PencilIcon />
          </TooltipTrigger>
          <TooltipContent>Editar periodo de evaluación</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger render={<Button color="primary" size="sm" />}>
          <ControlPointIcon data-icon="inline-start" />
          Agregar
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl" inert={confirmDiscardOpen}>
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
          <form.AppField name="codigo">
            {(field) => <field.TextField label="Código" required maxLength={30} />}
          </form.AppField>

          <form.AppField name="nombre">
            {(field) => <field.TextField label="Nombre" required maxLength={130} />}
          </form.AppField>

          <form.AppField name="abreviacion">
            {(field) => <field.TextField label="Abreviación" required maxLength={30} />}
          </form.AppField>

          <form.AppField
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
                if (dateWithinOtherPeriod(value)) {
                  return {
                    message: "Ya existe un periodo de evaluación con esta fecha.",
                  }
                }
                return undefined
              },
            }}
          >
            {(field) => (
              <form.Subscribe selector={(state) => [state.values.startDate, state.values.endDate]}>
                {([startDate, endDate]) => {
                  // Avisos que no son errores de validación: el campo los
                  // muestra solo mientras no tenga un error propio.
                  const outOfRange = !!startDate && !!endDate && startDate >= endDate
                  const noAvailableEndDate = !!startDate && !hasAvailableEndDate(startDate)
                  return (
                    <field.DateField
                      label="Fecha inicio"
                      required
                      disabledRanges={otherPeriodsDateRanges}
                      minDate={academicPeriodMinDate}
                      maxDate={academicPeriodMaxDate}
                      description={
                        noAvailableEndDate ? (
                          <p role="alert" className="text-red text-xs">
                            No queda ningún día disponible para la fecha de fin después de esta
                            fecha de inicio: el siguiente día ya pertenece a otro periodo de
                            evaluación. Elige otra fecha de inicio.
                          </p>
                        ) : outOfRange ? (
                          <p role="alert" className="text-muted-foreground text-xs">
                            La fecha de inicio debe ser anterior a la fecha de fin del período de
                            evaluación.
                          </p>
                        ) : null
                      }
                    />
                  )
                }}
              </form.Subscribe>
            )}
          </form.AppField>

          <form.AppField
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
                if (dateWithinOtherPeriod(value)) {
                  return {
                    message: "Ya existe un periodo de evaluación con esta fecha.",
                  }
                }
                return undefined
              },
            }}
          >
            {(field) => (
              <form.Subscribe selector={(state) => state.values.startDate}>
                {(startDate) => {
                  const dayAfterStart = startDate
                    ? addDays(parseDateValue(startDate) as Date, 1)
                    : undefined
                  const minEndDate =
                    dayAfterStart && (!academicPeriodMinDate || dayAfterStart > academicPeriodMinDate)
                      ? dayAfterStart
                      : academicPeriodMinDate
                  const nextStart = startDate ? nextOtherPeriodStart(startDate) : undefined
                  const dayBeforeNextStart = nextStart
                    ? addDays(parseDateValue(nextStart) as Date, -1)
                    : undefined
                  const maxEndDate =
                    dayBeforeNextStart &&
                    (!academicPeriodMaxDate || dayBeforeNextStart < academicPeriodMaxDate)
                      ? dayBeforeNextStart
                      : academicPeriodMaxDate
                  return (
                    <field.DateField
                      label="Fecha fin"
                      required
                      disabledRanges={otherPeriodsDateRanges}
                      minDate={minEndDate}
                      maxDate={maxEndDate}
                    />
                  )
                }}
              </form.Subscribe>
            )}
          </form.AppField>

          <form.AppField
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
            {(field) => (
              <field.NumberField
                label="Peso porcentual (%)"
                required
                valueAs="number"
                maxDigits={3}
                suffix="%"
              />
            )}
          </form.AppField>

          <form.AppField name="estadoId">
            {(field) => (
              <field.SelectField
                label="Estado"
                required
                options={statusSelectOptions}
                emptyValue={0}
                placeholder="Seleccionar"
                disabled={!isEditing}
                renderValue={(option) => {
                  const status = statusOptions.find((o) => o.id === option.value)
                  const badge = status ? EVALUATION_PERIOD_STATUS_BADGE[status.key] : undefined
                  return (
                    <Badge {...badge} className="text-xs">
                      {option.label}
                    </Badge>
                  )
                }}
              />
            )}
          </form.AppField>
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
              const noOverlap = !rangeOverlapsOtherPeriod(values.startDate, values.endDate)
              return (
                <Button
                  size="sm"
                  type="submit"
                  color="primary"
                  form={FORM_ID}
                  disabled={
                    isSaving || !allRequiredFilled || !datesWithinAcademicPeriod || !noOverlap
                  }
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
