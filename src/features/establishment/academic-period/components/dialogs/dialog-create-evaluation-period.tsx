import { useRef, useState } from "react"
import { addDays } from "date-fns"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useAppForm } from "@/lib/forms"
import { ControlPointIcon, FloppyDiskIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { getErrorMessage } from "@/lib/api-client"
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
import { useEvaluationPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-periods"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"
import { parseDateValue } from "@/lib/date-value"
import {
  evaluationPeriodFormSchema,
  type EvaluationPeriodFormValues,
} from "@/features/establishment/academic-period/api/schema"
import { DecimalField } from "@/features/establishment/academic-period/components/fields/decimal-field"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"

const EMPTY: EvaluationPeriodFormValues = {
  nombre: "",
  abreviacion: "",
  startDate: "",
  endDate: "",
  peso: Number.NaN,
}

const FORM_ID = "evaluation-period-form"

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

interface CreateEvaluationPeriodDialogProps {
  academicPeriodId?: number
  period?: EvaluationPeriod
}

// Agregar y Modificar período de evaluación (Sección 5.1; Reglas 30, 34, 35 y 36).
// Los errores salen bajo cada campo con los mensajes del back; el estado no se
// captura (lo calculan las fechas, Regla 37).
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

  // Regla 34: el primero (por fecha) con el que se cruza el rango.
  function overlappingPeriod(start: string, end: string) {
    const to = end && end >= start ? end : start
    return otherPeriods
      .filter((p) => start <= p.endDate && p.startDate <= to)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
  }

  function nextOtherPeriodStart(start: string): string | undefined {
    return otherPeriods
      .map((p) => p.startDate)
      .filter((s) => s > start)
      .sort()[0]
  }

  const otherPeriodsDateRanges = otherPeriods.map((p) => ({
    from: parseDateValue(p.startDate) as Date,
    to: parseDateValue(p.endDate) as Date,
  }))
  const academicPeriodMinDate = parseDateValue(academicPeriodStart)
  const academicPeriodMaxDate = parseDateValue(academicPeriodEnd)

  const defaultValues: EvaluationPeriodFormValues = period
    ? {
        nombre: period.nombre,
        abreviacion: period.abreviacion,
        startDate: period.startDate,
        endDate: period.endDate,
        peso: period.peso ?? Number.NaN,
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
    onSubmit: ({ value }) => {
      const values = { ...value, nombre: value.nombre.trim(), abreviacion: value.abreviacion.trim() }
      if (isEditing) {
        updateEvaluation.mutate({ academicPeriodId, id: period.id, values })
      } else {
        createEvaluation.mutate({ ...values, academicPeriodId })
      }
    },
  })

  function handleOpenChange(next: boolean) {
    if (next) form.reset(defaultValues)
    setNotice(null)
    setOpen(next)
  }

  const { confirmDiscardOpen, requestClose, onOpenChange, discardDialogProps } = useGuardedDialog({
    isSaving,
    isDirty: () => !formValuesEqual(form.state.values, defaultValues),
    onOpen: () => handleOpenChange(true),
    onClose: () => handleOpenChange(false),
  })

  const title = isEditing ? "Modificar período de evaluación" : "Agregar período de evaluación"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {isEditing ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
            }
          >
            <span className="sr-only">Modificar período de evaluación</span>
            <PencilIcon />
          </TooltipTrigger>
          <TooltipContent>Modificar</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger render={<Button color="primary" size="sm" />}>
          <ControlPointIcon data-icon="inline-start" />
          Agregar período de evaluación
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? 12000 : 4000}
        />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
        >
          <form.AppField
            name="nombre"
            validators={{
              onChange: ({ value }) =>
                otherPeriods.some((p) => sameText(p.nombre, value))
                  ? { message: "Ya existe un período de evaluación con ese Nombre." }
                  : undefined,
            }}
          >
            {(field) => (
              <field.TextField label="Nombre" required maxLength={100} placeholder="Primer período" />
            )}
          </form.AppField>

          <form.AppField
            name="abreviacion"
            validators={{
              onChange: ({ value }) =>
                otherPeriods.some((p) => sameText(p.abreviacion, value))
                  ? { message: "Ya existe un período de evaluación con esa Abreviación." }
                  : undefined,
            }}
          >
            {(field) => (
              <field.TextField label="Abreviación" required maxLength={10} placeholder="PE1" />
            )}
          </form.AppField>

          <form.AppField
            name="startDate"
            validators={{
              onChangeListenTo: ["endDate"],
              onChange: ({ value, fieldApi }) => {
                if (!value) return undefined
                if (academicPeriodStart && value < academicPeriodStart) {
                  return {
                    message:
                      "El primer período de evaluación no puede empezar antes del Inicio del período académico.",
                  }
                }
                if (academicPeriodEnd && value > academicPeriodEnd) {
                  return { message: "Las fechas deben estar dentro del período académico." }
                }
                const cruce = overlappingPeriod(value, fieldApi.form.getFieldValue("endDate"))
                if (cruce) {
                  return { message: `Las fechas se cruzan con el período de evaluación ${cruce.nombre}.` }
                }
                return undefined
              },
            }}
          >
            {(field) => (
              <field.DateField
                label="Fecha inicio"
                required
                disabledRanges={otherPeriodsDateRanges}
                minDate={academicPeriodMinDate}
                maxDate={academicPeriodMaxDate}
              />
            )}
          </form.AppField>

          <form.AppField
            name="endDate"
            validators={{
              onChangeListenTo: ["startDate"],
              onChange: ({ value }) => {
                if (!value) return undefined
                if (academicPeriodEnd && value > academicPeriodEnd) {
                  return { message: "Las fechas deben estar dentro del período académico." }
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

          <form.Field
            name="peso"
            validators={{
              onChange: ({ value }) =>
                Number.isFinite(value) && otherPeriodsWeightSum + value > 100
                  ? { message: "La suma de los pesos no puede superar el 100 %." }
                  : undefined,
            }}
          >
            {(field) => (
              <div className="sm:col-span-2">
                <DecimalField
                  field={field}
                  label="Peso porcentual (%)"
                  required
                  suffix="%"
                  description={`Los demás períodos suman ${otherPeriodsWeightSum.toLocaleString("es-CO")} %.`}
                />
              </div>
            )}
          </form.Field>
        </form>

        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <form.Subscribe selector={(state) => state.canSubmit}>
            {(canSubmit) => (
              <Button
                size="sm"
                type="submit"
                color="primary"
                form={FORM_ID}
                disabled={isSaving || !canSubmit}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>

      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}
