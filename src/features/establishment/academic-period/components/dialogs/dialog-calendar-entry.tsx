import { useState } from "react"
import { z } from "zod"
import { useSelector } from "@tanstack/react-form"

import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, minLength, required } from "@/lib/forms/messages"
import { parseDateValue } from "@/lib/date-value"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useSaveCalendarEntry } from "@/features/establishment/academic-period/api/mutations/save-calendar-entry"
import type {
  CalendarEntry,
  CalendarEntryInput,
} from "@/features/establishment/academic-period/api/types/academic-calendar"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import {
  CALENDAR_ENTRY_TYPE_LABELS,
  REGISTERED_ENTRY_TYPES,
} from "@/features/establishment/academic-period/utils/academic-calendar"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"
import { toPeriodoLongTextInput } from "@/features/establishment/academic-period/utils/text-input"

const FORM_ID = "calendar-entry-form"

// Campos de "Agregar al calendario" (Sección 5.8). Las fechas dentro del
// período y la regla de "Día hábil por excepción" las valida el back.
const calendarEntrySchema = z
  .object({
    type: z.enum(REGISTERED_ENTRY_TYPES),
    from: z.string().min(1, required("La Fecha desde", { femenino: true })),
    to: z.string().min(1, required("La Fecha hasta", { femenino: true })),
    reason: z
      .string()
      .trim()
      .min(5, minLength(5, "El motivo"))
      .max(150, maxLength(150, "El motivo")),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.to < data.from) {
      ctx.addIssue({
        code: "custom",
        message: "La Fecha hasta no puede ser anterior a la Fecha desde.",
        path: ["to"],
      })
    }
  })

interface CalendarEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  academicPeriodId: number
  periodStart: string
  periodEnd: string
  // Modificar una entrada registrada; sin ella agrega una nueva.
  entry?: CalendarEntry | null
}

export function CalendarEntryDialog({
  open,
  onOpenChange,
  academicPeriodId,
  periodStart,
  periodEnd,
  entry,
}: CalendarEntryDialogProps) {
  const isEditing = entry != null
  const { notify } = useNotify()
  const [notice, setNotice] = useState<{
    id: number
    message: string
    variant: NoticeVariant
  } | null>(null)
  const saveMutation = useSaveCalendarEntry()
  const isSaving = saveMutation.isPending

  const defaultValues: CalendarEntryInput = {
    type: entry && entry.type !== "FESTIVO" ? entry.type : "VACACIONES",
    from: entry?.from ?? "",
    to: entry?.to ?? "",
    reason: entry?.reason ?? "",
  }

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: calendarEntrySchema },
    onSubmit: ({ value }) => {
      setNotice(null)
      saveMutation.mutate(
        { academicPeriodId, id: entry?.id, values: value },
        {
          onSuccess: () => {
            notify(
              isEditing
                ? SUCCESS_MESSAGES.academicCalendar.updated
                : SUCCESS_MESSAGES.academicCalendar.created,
            )
            close()
          },
          onError: (error) =>
            setNotice({ id: Date.now(), message: getErrorMessage(error), variant: "error" }),
        },
      )
    },
  })

  const from = useSelector(form.store, (s) => s.values.from)

  function close() {
    onOpenChange(false)
    setNotice(null)
    form.reset(defaultValues)
  }

  const {
    confirmDiscardOpen,
    requestClose,
    onOpenChange: guardedOpenChange,
    discardDialogProps,
  } = useGuardedDialog({
    isSaving,
    isDirty: () => !formValuesEqual(form.state.values, defaultValues),
    onOpen: () => {},
    onClose: close,
  })

  const minDate = parseDateValue(periodStart)
  const maxDate = parseDateValue(periodEnd)

  return (
    <Dialog open={open} onOpenChange={guardedOpenChange}>
      <DialogContent className="sm:max-w-3xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modificar entrada del calendario" : "Agregar al calendario"}
          </DialogTitle>
        </DialogHeader>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant={notice?.variant} />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
        >
          <form.Field name="type">
            {(field) => (
              <fieldset className="flex flex-col gap-2 sm:col-span-2">
                <legend className="mb-2 text-sm">
                  Tipo<span className="text-red"> *</span>
                </legend>
                <RadioGroup
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 md:flex-nowrap"
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v as CalendarEntryInput["type"])}
                >
                  {REGISTERED_ENTRY_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm whitespace-nowrap">
                      <RadioGroupItem value={type} />
                      {CALENDAR_ENTRY_TYPE_LABELS[type]}
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
            )}
          </form.Field>

          <form.AppField
            name="from"
            listeners={{
              // Un solo día: Fecha hasta sigue a Fecha desde mientras esté vacía o antes.
              onChange: ({ value }) => {
                const to = form.getFieldValue("to")
                if (value && (!to || to < value)) form.setFieldValue("to", value)
              },
            }}
          >
            {(field) => (
              <field.DateField label="Fecha desde" required minDate={minDate} maxDate={maxDate} />
            )}
          </form.AppField>
          <form.AppField name="to">
            {(field) => (
              <field.DateField
                label="Fecha hasta"
                required
                minDate={parseDateValue(from) ?? minDate}
                maxDate={maxDate}
                description="Para un solo día, igual a Fecha desde."
              />
            )}
          </form.AppField>

          <div className="sm:col-span-2">
            <form.AppField name="reason">
              {(field) => (
                <field.TextField
                  label="Motivo"
                  required
                  maxLength={150}
                  showCounter
                  transform={toPeriodoLongTextInput}
                  placeholder="P. ej. Semana de receso"
                />
              )}
            </form.AppField>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}
