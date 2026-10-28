import { useRef, useState } from "react"
import { z } from "zod"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"
import { getErrorMessage } from "@/lib/api-client"
import { FloppyDiskIcon, PlusIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldVariantContext } from "@/hooks/use-field-variant"
import { toFieldErrors } from "@/lib/forms"

import { useCreateRatingScalesBulk } from "@/features/establishment/academic-period/api/mutations/create-rating-scales-bulk"
import { useUpdateRatingScale } from "@/features/establishment/academic-period/api/mutations/update-rating-scale"
import { useDeleteRatingScale } from "@/features/establishment/academic-period/api/mutations/delete-rating-scale"
import {
  useRatingScaleTypesQuery,
  useRatingSymbolsQuery,
} from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import {
  bandaIdForLevel,
  type RatingScale,
  type TeachingLevel,
} from "@/features/establishment/academic-period/api/types/rating-scales"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { DecimalField } from "@/features/establishment/academic-period/components/fields/decimal-field"
import { RatingSymbolSelect } from "@/features/establishment/academic-period/components/fields/rating-symbol"
import type { GradingRange } from "@/features/establishment/academic-period/utils/grading-range"
import { formatGrade } from "@/features/establishment/academic-period/utils/rating-scale-coverage"
import {
  findDuplicateRatingScale,
  findOverlappingRatingScale,
} from "@/features/establishment/academic-period/utils/rating-scale-duplicates"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"

const FORM_ID = "rating-scale-form"

interface RatingScaleFormValues {
  teachingLevelId: number
  tipo: string
  nombre: string
  abreviacion: string
  iconografia: string
  notaMinima: number
  notaMaxima: number
  notaEquivalente: number
}

// Formulario de la valoración (Sección 5.2). Los rangos dependen del Formato de
// calificación de los Criterios de evaluación (Regla 51).
function makeSchema(range: GradingRange, singleScale: boolean) {
  const nota = (label: string) =>
    z
      .number({ error: required(label, { femenino: true }) })
      .min(range.min, `${label} debe estar entre ${formatGrade(range.min)} y ${formatGrade(range.max)}.`)
      .max(range.max, `${label} debe estar entre ${formatGrade(range.min)} y ${formatGrade(range.max)}.`)
  return z
    .object({
      teachingLevelId: singleScale
        ? z.number()
        : z.number().int().positive(required("El nivel de enseñanza")),
      tipo: z.string().min(1, required("El tipo de valoración")),
      nombre: z
        .string()
        .trim()
        .min(4, "El nombre debe tener al menos 4 caracteres")
        .max(50, maxLength(50, "El nombre")),
      abreviacion: z
        .string()
        .trim()
        .min(1, required("La abreviación", { femenino: true }))
        .max(10, maxLength(10, "La abreviación")),
      iconografia: z.string().min(1, required("La iconografía", { femenino: true })),
      notaMinima: nota("La Nota mínima"),
      notaMaxima: nota("La Nota máxima"),
      notaEquivalente: nota("La Nota equivalente"),
    })
    .superRefine((data, ctx) => {
      if (data.notaMinima > data.notaMaxima) {
        ctx.addIssue({
          code: "custom",
          message: "La Nota mínima no puede ser mayor que la Nota máxima.",
          path: ["notaMinima"],
        })
      }
      if (data.notaEquivalente < data.notaMinima || data.notaEquivalente > data.notaMaxima) {
        ctx.addIssue({
          code: "custom",
          message: "La Nota equivalente debe estar entre la Nota mínima y la Nota máxima.",
          path: ["notaEquivalente"],
        })
      }
    })
}

interface RatingScaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  academicPeriodId?: number
  range: GradingRange
  // Con una sola escala para el período no se elige nivel (Regla 50).
  singleScale: boolean
  levels: TeachingLevel[]
  // Nivel con el que abre: el del filtro al agregar, el de la fila al modificar.
  levelId: number | null
  // Valoración a modificar; sin ella, el diálogo agrega una nueva.
  scale?: RatingScale | null
  // Valoraciones de un nivel, para validar nombres y rangos repetidos.
  scalesForLevel: (levelId: number | null) => RatingScale[]
}

export function RatingScaleDialog({
  open,
  onOpenChange,
  academicPeriodId,
  range,
  singleScale,
  levels,
  levelId,
  scale,
  scalesForLevel,
}: RatingScaleDialogProps) {
  const isEditing = scale != null
  const { notify } = useNotify()
  const { data: tipoOptions = [] } = useRatingScaleTypesQuery()
  const { data: symbols = [] } = useRatingSymbolsQuery()

  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(
    null,
  )
  const noticeIdRef = useRef(0)
  function notifyInDialog(message: string) {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant: "error" })
  }

  const defaultValues: RatingScaleFormValues = scale
    ? {
        teachingLevelId: levelId ?? 0,
        tipo: scale.tipo,
        nombre: scale.nombre,
        abreviacion: scale.abreviacion,
        iconografia: scale.iconografia,
        notaMinima: scale.notaMinima,
        notaMaxima: scale.notaMaxima,
        notaEquivalente: scale.notaEquivalente,
      }
    : {
        // El md fija los valores iniciales: máximo 10 (el del formato), mínimo y equivalente 0.
        teachingLevelId: levelId ?? 0,
        tipo: "",
        nombre: "",
        abreviacion: "",
        iconografia: "",
        notaMinima: range.min,
        notaMaxima: range.max,
        notaEquivalente: range.min,
      }

  function close() {
    setNotice(null)
    onOpenChange(false)
  }

  const createMutation = useCreateRatingScalesBulk({
    mutationConfig: {
      onSuccess: () => {
        notify(SUCCESS_MESSAGES.ratingScale.created)
        close()
      },
      onError: (error) => notifyInDialog(getErrorMessage(error)),
    },
  })
  const updateMutation = useUpdateRatingScale({
    mutationConfig: {
      onSuccess: (result) => {
        if (result?.status === "error") {
          notifyInDialog(result.message)
          return
        }
        notify(SUCCESS_MESSAGES.ratingScale.updated)
        close()
      },
      onError: (error) => notifyInDialog(getErrorMessage(error)),
    },
  })
  const deleteMutation = useDeleteRatingScale()
  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: makeSchema(range, singleScale) },
    onSubmit: async ({ value }) => {
      const targetLevel = singleScale ? null : value.teachingLevelId
      const others = scalesForLevel(targetLevel).filter((s) => !scale || s.codigo !== scale.codigo)
      const draft = {
        ...value,
        nombre: value.nombre.trim(),
        abreviacion: value.abreviacion.trim(),
      }
      const duplicate = findDuplicateRatingScale(draft, others)
      if (duplicate) {
        const campo = duplicate.field === "nombre" ? "ese nombre" : "esa abreviación"
        notifyInDialog(`Ya existe una valoración con ${campo} en este nivel de enseñanza.`)
        return
      }
      const overlapping = findOverlappingRatingScale(draft, others)
      if (overlapping) {
        notifyInDialog(
          `Las valoraciones ${draft.nombre} y ${overlapping.nombre} se cruzan. Ajuste la Nota mínima o la Nota máxima.`,
        )
        return
      }
      if (academicPeriodId == null) return

      const values = {
        nombre: draft.nombre,
        abreviacion: draft.abreviacion,
        tipo: draft.tipo,
        iconografia: draft.iconografia,
        notaMinima: draft.notaMinima,
        notaMaxima: draft.notaMaxima,
        notaEquivalente: draft.notaEquivalente,
      }
      // Una sola escala = la misma valoración en todos los niveles.
      const teachingLevelIds = singleScale
        ? isEditing
          ? scale.teachingLevelIds
          : levels.map((l) => l.id)
        : [value.teachingLevelId]

      if (!isEditing) {
        createMutation.mutate({ teachingLevelIds, scales: [values], academicPeriodId })
        return
      }
      // No hay `fn_escala_actualizar`: se borra y se recrea. Con una sola escala
      // la valoración tiene una banda por nivel; se borran las demás antes.
      const bandaId = singleScale ? scale.bandaIdsByLevel[0] : bandaIdForLevel(scale, levelId ?? 0)
      if (singleScale) {
        try {
          for (const id of scale.bandaIdsByLevel.slice(1)) await deleteMutation.mutateAsync(id)
        } catch (error) {
          notifyInDialog(getErrorMessage(error))
          return
        }
      }
      updateMutation.mutate({
        codigo: bandaId,
        academicPeriodId,
        values: { ...scale, ...values, teachingLevelIds },
      })
    },
  })

  const { confirmDiscardOpen, requestClose, onOpenChange: guardedOpenChange, discardDialogProps } =
    useGuardedDialog({
      isSaving,
      isDirty: () => !formValuesEqual(form.state.values, defaultValues),
      onOpen: () => {},
      onClose: close,
    })

  return (
    <Dialog open={open} onOpenChange={guardedOpenChange}>
      <DialogContent className="sm:max-w-3xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modificar valoración" : "Agregar valoración"}</DialogTitle>
        </DialogHeader>

        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={12000}
        />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-y-5"
        >
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {!singleScale && (
              <form.AppField name="teachingLevelId">
                {(field) => (
                  <field.SelectField
                    label="Niveles de enseñanza"
                    required
                    emptyValue={0}
                    placeholder="Seleccione..."
                    options={levels.map((l) => ({ value: l.id, label: l.nombre }))}
                  />
                )}
              </form.AppField>
            )}
            <form.AppField name="tipo">
              {(field) => (
                <field.SelectField
                  label="Tipo de valoración"
                  required
                  placeholder="Seleccione..."
                  options={tipoOptions.map((o) => ({ value: o.key, label: o.label }))}
                />
              )}
            </form.AppField>
          </div>

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
            <form.AppField name="nombre">
              {(field) => (
                <field.TextField label="Nombre" required maxLength={50} showCounter placeholder="" />
              )}
            </form.AppField>
            <form.AppField name="abreviacion">
              {(field) => (
                <field.TextField label="Abreviación" required maxLength={10} showCounter placeholder="" />
              )}
            </form.AppField>
            <form.Field name="iconografia">
              {(field) => {
                const invalid = form.state.submissionAttempts > 0 && !field.state.meta.isValid
                return (
                  <Field variant="outlined" data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor="rating-scale-icon">
                      Iconografía<span className="text-red"> *</span>
                    </FieldLabel>
                    <FieldVariantContext.Provider value="outlined">
                      <RatingSymbolSelect
                        id="rating-scale-icon"
                        symbols={symbols}
                        value={field.state.value}
                        onChange={(valor) => field.handleChange(valor)}
                        invalid={invalid}
                        placeholder="Seleccione..."
                      />
                    </FieldVariantContext.Provider>
                    {invalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
                  </Field>
                )
              }}
            </form.Field>
          </div>

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
            <form.Field name="notaMinima">
              {(field) => <DecimalField field={field} label="Nota mínima" required />}
            </form.Field>
            <form.Field name="notaMaxima">
              {(field) => <DecimalField field={field} label="Nota máxima" required />}
            </form.Field>
            <form.Field name="notaEquivalente">
              {(field) => (
                <DecimalField
                  field={field}
                  label="Nota equivalente"
                  required
                  description="Entre la Nota mínima y la Nota máxima."
                />
              )}
            </form.Field>
          </div>
        </form>

        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : isEditing ? (
              <FloppyDiskIcon data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            {isEditing ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}
