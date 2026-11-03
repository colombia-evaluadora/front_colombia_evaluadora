import { useState } from "react"
import { z } from "zod"
import { useSelector } from "@tanstack/react-form"
import { addDays, format } from "date-fns"

import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, minLength, required } from "@/lib/forms/messages"
import { formatCalendarRange } from "@/features/establishment/academic-period/utils/academic-calendar"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowCounterClockwiseIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { useReopenAcademicPeriod } from "@/features/establishment/academic-period/api/mutations/reopen-academic-period"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"

const FORM_ID = "reopen-academic-period-form"

// Regla 16: Motivo de 10 a 500 caracteres y "Cerrar de nuevo el" posterior a hoy.
const reopenSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(10, minLength(10, "El motivo"))
    .max(500, maxLength(500, "El motivo")),
  cerrarEl: z
    .string()
    .min(1, required("La fecha", { femenino: true }))
    .refine((v) => v > format(new Date(), "yyyy-MM-dd"), "La fecha debe ser posterior a hoy."),
})

interface ReopenAcademicPeriodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodId: number
  // "IE Central · 2026 · Mañana · Anual · C1" (Regla 14).
  periodTitle: string
}

export function ReopenAcademicPeriodDialog({
  open,
  onOpenChange,
  periodId,
  periodTitle,
}: ReopenAcademicPeriodDialogProps) {
  const { notify } = useNotify()
  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(
    null,
  )
  const reopen = useReopenAcademicPeriod()
  const isSaving = reopen.isPending
  const defaultValues = { motivo: "", cerrarEl: "" }

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: reopenSchema },
    onSubmit: ({ value }) => {
      setNotice(null)
      reopen.mutate(
        { id: periodId, motivo: value.motivo, cerrarEl: value.cerrarEl },
        {
          onSuccess: () => {
            notify(SUCCESS_MESSAGES.academicPeriod.reopened)
            close()
          },
          onError: (error) =>
            setNotice({ id: Date.now(), message: getErrorMessage(error), variant: "error" }),
        },
      )
    },
  })

  const cerrarEl = useSelector(form.store, (s) => s.values.cerrarEl)

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

  return (
    <Dialog open={open} onOpenChange={guardedOpenChange}>
      <DialogContent className="sm:max-w-lg" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>Reabrir el período académico</DialogTitle>
          <DialogDescription>
            El período {periodTitle} volverá a Abierto
            {cerrarEl ? ` hasta el ${formatCalendarRange(cerrarEl, cerrarEl)}` : ""}. Solo se reabre este período.
          </DialogDescription>
        </DialogHeader>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant={notice?.variant} />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-5"
        >
          <form.AppField name="motivo">
            {(field) => (
              <field.TextareaField
                label="Motivo"
                required
                maxLength={500}
                rows={3}
                placeholder="P. ej. Faltaba registrar las notas de nivelación"
              />
            )}
          </form.AppField>
          <form.AppField name="cerrarEl">
            {(field) => (
              <field.DateField
                label="Cerrar de nuevo el"
                required
                minDate={addDays(new Date(), 1)}
                description="Posterior a hoy."
              />
            )}
          </form.AppField>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" color="primary" form={FORM_ID} disabled={isSaving} aria-busy={isSaving}>
            {isSaving ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
            )}
            Reabrir
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}
