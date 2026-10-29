import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useSelector } from "@tanstack/react-form"
import { FormDisabledProvider, isFieldInvalid, toFieldErrors, useAppForm } from "@/lib/forms"
import {
  PeriodReadOnlyNotice,
  usePeriodReadOnly,
} from "@/features/establishment/academic-period/utils/period-read-only"
import { INCOMPLETE_FORM } from "@/lib/forms/messages"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import type { NotifyOptions } from "@/components/notice/pending-notice"
import { getErrorMessage } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CheckIcon, InfoIcon } from "@/components/ui/icons"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useEvaluationCriteriaOptionsQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import { useRatingScalesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scales"
import { useUpdateEvaluationCriteria } from "@/features/establishment/academic-period/api/mutations/update-evaluation-criteria"
import {
  makeEvaluationCriteriaSchema,
  type EvaluationCriteriaValues,
} from "@/features/establishment/academic-period/api/schema"
import type { CriteriaOption } from "@/features/establishment/academic-period/api/types/evaluation-criteria"
import { parseGradingRange } from "@/features/establishment/academic-period/utils/grading-range"
import { FormSection } from "@/features/establishment/academic-period/components/fields/form-section"
import { DecimalField } from "@/features/establishment/academic-period/components/fields/decimal-field"

const EMPTY: EvaluationCriteriaValues = {
  gradingFormat: "",
  gradingScale: "",
  periodCalculationElements: "",
  subjectGradeCriteria: "",
  finalGradeCriteria: "",
  areaGradeCriteria: "",
  studentWithoutGradesPerformance: "",
  maxRecoveryGrade: 9,
  roundingMode: "",
  initialGrade: 1,
  ratingScaleMode: "",
  recoveryMode: "",
  recoveryPercentage: null,
}

const FORM_ID = "evaluation-criteria-form"

const gradeFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

interface TabEvaluationCriteriaProps {
  academicPeriodId?: number
  /** Avisa si hay cambios sin guardar: el Guardar del encabezado del período los guarda. */
  onDirtyChange?: (dirty: boolean) => void
}

type Notifier = (message: string, options?: NotifyOptions) => void

// Lo usa el Guardar del encabezado del período. `save` avisa con el `notify`
// de la página (la pestaña puede estar oculta) y devuelve false si hay campos
// con errores o si el back rechazó.
export interface EvaluationCriteriaHandle {
  save: (notify: Notifier) => Promise<boolean>
  isDirty: () => boolean
  /** Vuelve a los valores guardados (al salir de la pestaña descartando). */
  discard: () => void
}

// Valor por defecto por nombre: las claves de las opciones son pk de TLISTA_VALOR.
const defaultKey = (list: CriteriaOption[] | undefined, nombre: RegExp) =>
  list?.find((o) => nombre.test(o.label))?.key ?? ""

export const TabEvaluationCriteria = forwardRef<
  EvaluationCriteriaHandle,
  TabEvaluationCriteriaProps
>(function TabEvaluationCriteria({ academicPeriodId, onDirtyChange }, ref) {
  const { data: criteria, isPending: isLoading } = useEvaluationCriteriaQuery(academicPeriodId)
  const { data: options, isPending: isLoadingOptions } = useEvaluationCriteriaOptionsQuery()
  const { data: ratingScalesData, isPending: isLoadingRatingScales } = useRatingScalesQuery({
    filters: {},
    sorting: [],
    academicPeriodId,
  })

  if ((academicPeriodId != null && isLoading) || isLoadingOptions || isLoadingRatingScales) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  // Valoraciones creadas por nivel: bloquean cambiar la Escala de valoración (Regla 50).
  const scalesByLevel = new Map<string, number>()
  for (const scale of ratingScalesData?.rows ?? []) {
    for (const level of scale.teachingLevels) {
      scalesByLevel.set(level.nombre, (scalesByLevel.get(level.nombre) ?? 0) + 1)
    }
  }

  // Los periodos de antes de los modos los traen vacios. El back lee el vacio
  // como "cada nivel"; sin estos defaults el formulario no pasaba la validacion
  // y Guardar no llamaba al back.
  const initialValues = { ...EMPTY, ...criteria }
  if (!initialValues.ratingScaleMode) {
    initialValues.ratingScaleMode = defaultKey(options?.ratingScaleMode, /cada nivel/i)
  }
  if (!initialValues.recoveryMode) {
    initialValues.recoveryMode = defaultKey(options?.recoveryMode, /usar nota/i)
  }

  return (
    <EvaluationCriteriaForm
      key={academicPeriodId ?? "new"}
      ref={ref}
      academicPeriodId={academicPeriodId}
      initialValues={initialValues}
      options={options}
      ratingScalesCount={ratingScalesData?.rows.length ?? 0}
      scalesByLevel={scalesByLevel}
      onDirtyChange={onDirtyChange}
    />
  )
})

interface EvaluationCriteriaFormProps {
  academicPeriodId?: number
  initialValues: EvaluationCriteriaValues
  options: ReturnType<typeof useEvaluationCriteriaOptionsQuery>["data"]
  ratingScalesCount: number
  scalesByLevel: Map<string, number>
  onDirtyChange?: (dirty: boolean) => void
}

const EvaluationCriteriaForm = forwardRef<EvaluationCriteriaHandle, EvaluationCriteriaFormProps>(
  function EvaluationCriteriaForm(
    { academicPeriodId, initialValues, options, ratingScalesCount, scalesByLevel, onDirtyChange },
    ref,
  ) {
    const { notify: notifyTab } = useNotify()
    // Mientras guarda el encabezado, los avisos van a la página y no a la pestaña.
    const headerNotify = useRef<Notifier | null>(null)
    const notify: Notifier = (message, options) =>
      (headerNotify.current ?? notifyTab)(message, options)
    const [scaleBlocked, setScaleBlocked] = useState(false)

    const labelOf = (list: CriteriaOption[] | undefined, key: string) =>
      list?.find((o) => o.key === key)?.label
    const rangeOf = (gradingFormat: string) =>
      parseGradingRange(labelOf(options?.gradingFormat, gradingFormat))
    const isWeighted = (recoveryMode: string) =>
      labelOf(options?.recoveryMode, recoveryMode)?.toLowerCase().startsWith("ponder") ?? false

    const saveCriteria = useUpdateEvaluationCriteria({
      mutationConfig: {
        onSuccess: (result) => {
          if (result.status === "error") {
            notify(result.message, { variant: "error" })
            return
          }
          notify(SUCCESS_MESSAGES.evaluationCriteria.updated)
          form.reset(form.state.values)
        },
        onError: (error) => {
          notify(getErrorMessage(error), { variant: "error" })
        },
      },
    })

    const form = useAppForm({
      defaultValues: initialValues,
      validators: { onSubmit: makeEvaluationCriteriaSchema(rangeOf, isWeighted) },
      onSubmitInvalid: () => notifyInvalid(),
      onSubmit: ({ value }) => {
        if (academicPeriodId == null) {
          notify(SUCCESS_MESSAGES.evaluationCriteria.updated)
          return
        }
        saveCriteria.mutate({ academicPeriodId, values: toRequest(value) })
      },
    })

    // Dice por qué no se guardó: los mensajes de los campos con error, sin repetir.
    function notifyInvalid() {
      const reasons = [
        ...new Set(
          Object.values(form.state.fieldMeta)
            .flatMap((meta) => toFieldErrors(meta?.errors ?? []))
            .map((e) => e.message)
            .filter(Boolean),
        ),
      ]
      notify(
        reasons.length > 0
          ? `No se guardaron los criterios de evaluación: ${reasons.join(" ")}`
          : INCOMPLETE_FORM,
        { variant: "error" },
      )
    }

    const toRequest = (value: EvaluationCriteriaValues) => ({
      ...value,
      recoveryPercentage: isWeighted(value.recoveryMode) ? value.recoveryPercentage : null,
    })

    const isDirty = useSelector(form.store, (s) => s.isDirty)
    const { readOnly } = usePeriodReadOnly()
    useEffect(() => {
      onDirtyChange?.(isDirty)
    }, [isDirty, onDirtyChange])
    // Al desmontar (cambio de periodo) ya no hay nada pendiente.
    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

    useImperativeHandle(ref, () => ({
      save: async (pageNotify) => {
        if (!form.state.isDirty || academicPeriodId == null) return true
        headerNotify.current = pageNotify
        await form.validateAllFields("submit")
        if (!form.state.isFieldsValid) {
          notifyInvalid()
          headerNotify.current = null
          return false
        }
        try {
          const result = await saveCriteria.mutateAsync({
            academicPeriodId,
            values: toRequest(form.state.values),
          })
          return result.status !== "error"
        } catch {
          return false
        } finally {
          headerNotify.current = null
        }
      },
      isDirty: () => form.state.isDirty,
      discard: () => form.reset(),
    }))

    const gradingFormat = useSelector(form.store, (s) => s.values.gradingFormat)
    const initialGrade = useSelector(form.store, (s) => s.values.initialGrade)
    const weighted = isWeighted(useSelector(form.store, (s) => s.values.recoveryMode))
    const range = rangeOf(gradingFormat)
    // Formato anterior, para llevar las notas al nuevo al cambiarlo.
    const prevFormat = useRef(gradingFormat)
    useEffect(() => {
      prevFormat.current = gradingFormat
    }, [gradingFormat])
    // Mismo % en la escala nueva (las notas se guardan en %), con 1 decimal.
    function convertGrades(nextFormat: string) {
      const from = rangeOf(prevFormat.current)
      const to = rangeOf(nextFormat)
      if (from.max === from.min) return
      const convert = (n: number) =>
        Math.round((to.min + ((n - from.min) / (from.max - from.min)) * (to.max - to.min)) * 10) /
        10
      for (const name of ["initialGrade", "maxRecoveryGrade"] as const) {
        const value = form.getFieldValue(name)
        if (Number.isFinite(value)) form.setFieldValue(name, convert(value))
      }
    }
    const fmt = (n: number) => gradeFormatter.format(n)
    const initialText = Number.isFinite(initialGrade) ? fmt(initialGrade) : "la nota inicial"

    // Select de catálogo; función de render (no componente) para no remontar el campo.
    function catalogSelect(
      name: Exclude<
        keyof EvaluationCriteriaValues,
        "gradingScale" | "initialGrade" | "maxRecoveryGrade" | "recoveryPercentage"
      >,
      label: string,
      items: CriteriaOption[],
      description?: string,
      onChange?: (value: string) => void,
    ) {
      return (
        <form.AppField
          name={name}
          listeners={onChange ? { onChange: ({ value }) => onChange(String(value)) } : undefined}
        >
          {(field) => (
            <field.SelectField
              label={label}
              required
              description={description}
              options={items.map((o) => ({ value: o.key, label: o.label }))}
            />
          )}
        </form.AppField>
      )
    }

    return (
      <>
        <form
          id={FORM_ID}
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormDisabledProvider disabled={readOnly}>
            <NoticeOutlet />
            <PeriodReadOnlyNotice what="los criterios de evaluación" />

            <p className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
              Registro único del período: estos valores rigen todos los cálculos de notas de Gestión
              Académica y se actualizan con Guardar.
            </p>

            <FormSection title="Escala y calificaciones">
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <form.Field name="ratingScaleMode">
                  {(field) => (
                    <Field
                      variant="outlined"
                      data-invalid={
                        isFieldInvalid(field, form.state.submissionAttempts) || undefined
                      }
                    >
                      <FieldLabel htmlFor={field.name}>
                        Escala de valoración<span className="text-red"> *</span>
                      </FieldLabel>
                      <ComboboxField
                        disabled={readOnly}
                        items={Object.fromEntries(
                          (options?.ratingScaleMode ?? []).map((o) => [o.key, o.label]),
                        )}
                        value={field.state.value}
                        onValueChange={(value) => {
                          if (!value || value === field.state.value) return
                          if (ratingScalesCount > 0) {
                            setScaleBlocked(true)
                            return
                          }
                          field.handleChange(value)
                        }}
                      >
                        <ComboboxFieldTrigger id={field.name}>
                          <ComboboxFieldValue placeholder="Seleccionar" />
                        </ComboboxFieldTrigger>
                        <ComboboxFieldContent>
                          <ComboboxGroup>
                            {(options?.ratingScaleMode ?? []).map((o) => (
                              <ComboboxFieldItem key={o.key} value={o.key}>
                                {o.label}
                              </ComboboxFieldItem>
                            ))}
                          </ComboboxGroup>
                        </ComboboxFieldContent>
                      </ComboboxField>
                      {isFieldInvalid(field, form.state.submissionAttempts) && (
                        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                      )}
                    </Field>
                  )}
                </form.Field>

                {catalogSelect(
                  "gradingFormat",
                  "Formato de calificación",
                  options?.gradingFormat ?? [],
                  undefined,
                  convertGrades,
                )}
                {catalogSelect(
                  "studentWithoutGradesPerformance",
                  "Sin calificaciones",
                  options?.studentWithoutGradesPerformance ?? [],
                )}

                <form.Field name="initialGrade">
                  {(field) => (
                    <DecimalField
                      field={field}
                      label="Nota inicial para las calificaciones"
                      required
                      description={`Entre ${fmt(range.min)} y ${fmt(range.max)}.`}
                    />
                  )}
                </form.Field>
                <form.Field name="maxRecoveryGrade">
                  {(field) => (
                    <DecimalField
                      field={field}
                      label="Nota máxima de recuperación"
                      required
                      description={`Entre ${initialText} y ${fmt(range.max)}.`}
                    />
                  )}
                </form.Field>
                {catalogSelect("roundingMode", "Regla de redondeo", options?.roundingMode ?? [])}
              </div>
            </FormSection>

            <FormSection title="Recuperación">
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <form.AppField
                  name="recoveryMode"
                  listeners={{
                    // Con Usar nota de recuperación el % queda vacío (Regla 48).
                    onChange: ({ value }) => {
                      if (!isWeighted(value)) form.setFieldValue("recoveryPercentage", null)
                    },
                  }}
                >
                  {(field) => (
                    <field.SelectField
                      label="Modo de cálculo de recuperación"
                      required
                      options={(options?.recoveryMode ?? []).map((o) => ({
                        value: o.key,
                        label: o.label,
                      }))}
                    />
                  )}
                </form.AppField>
                <form.Field name="recoveryPercentage">
                  {(field) => (
                    <DecimalField
                      field={field}
                      label="% de recuperación"
                      suffix="%"
                      nullable
                      required={weighted}
                      disabled={!weighted}
                      description={
                        weighted ? "Entre 1 y 100." : "Se habilita y es obligatorio con Ponderar."
                      }
                    />
                  )}
                </form.Field>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                La nota máxima de recuperación se define en «Escala y calificaciones».
              </p>
            </FormSection>

            <FormSection title="Cálculo de notas">
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                {catalogSelect(
                  "periodCalculationElements",
                  "Elementos para calcular la nota de la asignatura",
                  options?.periodCalculationElements ?? [],
                  "Con los rótulos del Referente curricular.",
                )}
                {catalogSelect(
                  "subjectGradeCriteria",
                  "Criterio para calcular la nota de la asignatura",
                  options?.subjectGradeCriteria ?? [],
                )}
                {catalogSelect(
                  "areaGradeCriteria",
                  "Criterio para calcular la nota del área",
                  options?.areaGradeCriteria ?? [],
                )}
                {catalogSelect(
                  "finalGradeCriteria",
                  "Criterio para calcular la nota final",
                  options?.finalGradeCriteria ?? [],
                )}
              </div>
            </FormSection>

            <div className="flex justify-end">
              <form.Subscribe selector={(state) => state.isDirty}>
                {(isDirty) =>
                  isDirty && !readOnly ? (
                    <Button
                      size="sm"
                      type="submit"
                      color="primary"
                      disabled={saveCriteria.isPending}
                    >
                      {saveCriteria.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                  ) : null
                }
              </form.Subscribe>
            </div>
          </FormDisabledProvider>
        </form>

        <AlertDialog open={scaleBlocked} onOpenChange={setScaleBlocked}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>No se puede cambiar la escala de valoración</AlertDialogTitle>
              <AlertDialogDescription>
                El período tiene {ratingScalesCount}{" "}
                {ratingScalesCount === 1 ? "valoración creada" : "valoraciones creadas"} con la
                configuración actual:{" "}
                {Array.from(scalesByLevel, ([nivel, n]) => `${nivel} (${n})`).join(", ")}.
                Elimínelas antes de cambiar la escala.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel color="primary">
                <CheckIcon data-icon="inline-start" />
                Entendido
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  },
)
