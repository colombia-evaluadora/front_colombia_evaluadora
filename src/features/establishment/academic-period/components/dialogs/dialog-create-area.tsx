import { useState } from "react"
import { z } from "zod"

import { getErrorMessage } from "@/lib/api-client"
import { toFieldErrors, useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { useCreateAreaSubject } from "@/features/establishment/academic-period/api/mutations/create-area-subject"
import { useGeneralAreasQuery } from "@/features/establishment/academic-period/api/query/use-general-areas"
import { usePeriodAreasQuery } from "@/features/establishment/academic-period/api/query/use-period-areas"
import { SelectGeneralAreaDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-select-general-area"
import { ColorPickerPopover } from "@/features/establishment/academic-period/components/fields/color-picker"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { DEFAULT_SUBJECT_COLOR } from "@/features/establishment/academic-period/utils/schedule-data"
import { toPeriodoTextInput, toPeriodoLongTextInput } from "@/features/establishment/academic-period/utils/text-input"

const FORM_ID = "create-area-form"

// "Crear área" (Regla 67): los mismos datos con que "Crear área con los mismos
// datos" arma el área desde una asignatura. Nombre y Abreviación son únicos
// dentro del período; eso lo valida el back.
const areaSchema = z.object({
  areaGeneral: z.string().min(1, required("El área general")),
  nombre: z
    .string()
    .trim()
    .min(4, "El nombre debe tener al menos 4 caracteres")
    .max(100, maxLength(100, "El nombre")),
  abreviacion: z
    .string()
    .trim()
    .min(2, "La abreviación debe tener al menos 2 caracteres")
    .max(10, maxLength(10, "La abreviación")),
  orden: z
    .number({ error: "El orden debe ser de 1 a 99." })
    .int("El orden debe ser de 1 a 99.")
    .min(1, "El orden debe ser de 1 a 99.")
    .max(99, "El orden debe ser de 1 a 99."),
  color: z.string().min(1, required("El color")),
})

interface CreateAreaDialogProps {
  academicPeriodId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  // El área creada queda seleccionada donde se abrió el diálogo.
  onSaved: (area: { id: number; nombre: string }) => void
}

export function CreateAreaDialog({ academicPeriodId, open, onOpenChange, onSaved }: CreateAreaDialogProps) {
  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)
  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const { refetch: refetchAreas } = usePeriodAreasQuery(academicPeriodId)
  const createArea = useCreateAreaSubject()
  const isSaving = createArea.isPending

  const defaultValues = {
    areaGeneral: "",
    nombre: "",
    abreviacion: "",
    orden: Number.NaN,
    color: DEFAULT_SUBJECT_COLOR,
  }

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: areaSchema },
    onSubmit: async ({ value }) => {
      const generalId = generalAreas.find((a) => a.nombre === value.areaGeneral)?.id
      if (generalId == null) return
      setNotice(null)
      try {
        const nombre = value.nombre.trim()
        const area = await createArea.mutateAsync({
          areaGeneral: String(generalId),
          nombreInterno: nombre,
          abreviacion: value.abreviacion.trim(),
          ordenReportes: value.orden,
          color: value.color,
          subjects: [],
          academicPeriodId,
        })
        // Que el selector de Área ya la tenga al seleccionarla.
        await refetchAreas()
        onSaved({ id: area.codigo, nombre })
        close()
      } catch (error) {
        setNotice({ id: Date.now(), message: getErrorMessage(error), variant: "error" })
      }
    },
  })

  function close() {
    onOpenChange(false)
    setNotice(null)
    form.reset(defaultValues)
  }

  // Sin confirmación de descarte, como "Crear asignatura": solo bloquea el cierre mientras guarda.
  const guarded = useGuardedDialog({
    isSaving,
    isDirty: () => false,
    onOpen: () => onOpenChange(true),
    onClose: close,
  })

  return (
    <Dialog open={open} onOpenChange={guarded.onOpenChange}>
      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear área</DialogTitle>
        </DialogHeader>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant={notice?.variant} />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <form.Field name="areaGeneral">
              {(field) => {
                const invalid = form.state.submissionAttempts > 0 && !field.state.meta.isValid
                return (
                  <Field variant="outlined" data-invalid={invalid || undefined}>
                    <FieldLabel>
                      Área general<span className="text-red"> *</span>
                    </FieldLabel>
                    <SelectGeneralAreaDialog
                      value={field.state.value}
                      onChange={(nombre) => field.handleChange(nombre)}
                      invalid={invalid}
                      allowDelete={false}
                    />
                    {invalid ? (
                      <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                    ) : (
                      <FieldDescription>Catálogo de Áreas oficiales.</FieldDescription>
                    )}
                  </Field>
                )
              }}
            </form.Field>
          </div>

          <form.AppField name="nombre">
            {(field) => (
              <field.TextField label="Nombre del área" transform={toPeriodoTextInput} required maxLength={100} showCounter placeholder="" />
            )}
          </form.AppField>
          <form.AppField name="abreviacion">
            {(field) => (
              <field.TextField
                label="Abreviación"
                required
                maxLength={10}
                showCounter
                placeholder=""
                transform={(v) => toPeriodoLongTextInput(v).toUpperCase()}
              />
            )}
          </form.AppField>

          <form.AppField name="orden">
            {(field) => <field.NumberField label="Orden" required valueAs="number" maxDigits={2} placeholder="" />}
          </form.AppField>
          <form.Field name="color">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel>
                  Color<span className="text-red"> *</span>
                </FieldLabel>
                <ColorPickerPopover value={field.state.value} onChange={(c) => field.handleChange(c)} />
              </Field>
            )}
          </form.Field>
        </form>

        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={close} disabled={isSaving}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="submit" form={FORM_ID} color="primary" disabled={isSaving} aria-busy={isSaving}>
            {isSaving ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Crear y seleccionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
