import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { AnyFieldApi } from "@tanstack/react-form"
import { useSelector } from "@tanstack/react-form"
import { FormDisabledProvider, useAppForm } from "@/lib/forms"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { CharacterCounter } from "@/components/ui/character-counter"
import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  InfoIcon,
  PlusIcon,
  WarningIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"

import { usePromotionCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-promotion-criteria"
import { useUpdatePromotionCriteria } from "@/features/establishment/academic-period/api/mutations/update-promotion-criteria"
import { useResetPromotionCriteria } from "@/features/establishment/academic-period/api/mutations/reset-promotion-criteria"
import {
  useSubjectsQuery,
  type SubjectOption,
} from "@/features/establishment/academic-period/api/query/use-subjects"
import {
  usePeriodAreasQuery,
  type AreaOption,
} from "@/features/establishment/academic-period/api/query/use-period-areas"
import { useCurriculumNodesQuery } from "@/features/establishment/academic-period/api/query/use-curriculum-nodes"
import type { CurriculumNodeOption } from "@/features/establishment/academic-period/api/types/curriculum-node"
import { useGradeSubjectLabel } from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import { pluralizeSubjectLabel } from "@/features/establishment/academic-period/utils/pluralize-subject-label"
import { FormSection } from "@/features/establishment/academic-period/components/fields/form-section"
import { DecimalField } from "@/features/establishment/academic-period/components/fields/decimal-field"
import { RequiredCurriculumSelect } from "@/features/establishment/academic-period/components/fields/required-curriculum-select"
import {
  NORM_REQUIREMENTS,
  PROMOTION_REQUIREMENTS_MAX,
  promotionApprovalSchema,
  type PromotionApprovalValues,
} from "@/features/establishment/academic-period/api/schema"

// Valores con los que nace el registro único del período (columna
// "Predeterminado" de la Sección 5.5).
const DEFAULTS: PromotionApprovalValues = {
  curriculumNode: "AS",
  maxFailedRecovery: 2,
  absencePercentage: 25,
  maxLeveledSubjects: 2,
  applyAverageApproval: false,
  basePercentage: 25,
  minimumSubjectPercentage: 25,
  maxFailedForAverage: 1,
  requiredSubjects: [],
  complementaryRequired: false,
  normRequirements: NORM_REQUIREMENTS.map((r) => r.code),
  ownRequirements: [],
}

const FORM_ID = "approval-parameters-form"

interface TabPromotionCriteriaProps {
  hideSubmit?: boolean
  academicPeriodId?: number
  gradeId?: number
  isPreescolar?: boolean
  // Nombre del grado para el encabezado "Criterios de promoción de [Grado]".
  gradeName?: string
  // Referente Formativo (Regla 106, punto 5): se muestran sin poder cambiarlos.
  readOnly?: boolean
  // Título del período ("IE Central · 2027 · …") para el diálogo de restablecer.
  periodTitle?: string
}

export interface PromotionCriteriaHandle {
  save: (gradeId: number) => Promise<void>
  isDirty: () => boolean
}

export const TabPromotionCriteria = forwardRef<PromotionCriteriaHandle, TabPromotionCriteriaProps>(
  function TabPromotionCriteria(
    { hideSubmit = false, academicPeriodId, gradeId, isPreescolar, gradeName, readOnly = false, periodTitle },
    ref,
  ) {
    const isGradeScope = gradeId != null
    const subjectLabel = useGradeSubjectLabel(gradeId, Boolean(isPreescolar))
    const [resetCount, setResetCount] = useState(0)
    const [confirmReset, setConfirmReset] = useState(false)
    const resetMutation = useResetPromotionCriteria()

    const { data: periodCriteria, isPending: periodLoading } =
      usePromotionCriteriaQuery(academicPeriodId)

    const { data: gradeCriteria, isPending: gradeLoading } = usePromotionCriteriaQuery(
      academicPeriodId,
      isGradeScope ? gradeId : undefined,
    )

    const criteria = isGradeScope ? (gradeCriteria ?? periodCriteria) : periodCriteria
    const isLoading = isGradeScope
      ? gradeLoading || (academicPeriodId != null && periodLoading)
      : periodLoading

    const { data: subjectOptions = [], isPending: isLoadingSubjects } =
      useSubjectsQuery(academicPeriodId)
    const { data: areaOptions = [], isPending: isLoadingAreas } =
      usePeriodAreasQuery(academicPeriodId)

    const { data: curriculumNodes = [], isPending: isLoadingCurriculumNodes } =
      useCurriculumNodesQuery()

    if (
      ((isGradeScope || academicPeriodId != null) && isLoading) ||
      isLoadingCurriculumNodes ||
      isLoadingSubjects ||
      isLoadingAreas
    ) {
      return (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )
    }

    // El grado tiene cambios propios si su registro difiere del período (Regla 57).
    const hasOwnChanges =
      isGradeScope &&
      gradeCriteria != null &&
      periodCriteria != null &&
      !formValuesEqual({ ...DEFAULTS, ...gradeCriteria }, { ...DEFAULTS, ...periodCriteria })

    const form = (
      <PromotionCriteriaForm
        key={
          isGradeScope ? `grade-${gradeId}-${resetCount}` : `period-${academicPeriodId ?? "new"}`
        }
        ref={ref}
        hideSubmit={hideSubmit || readOnly}
        readOnly={readOnly}
        academicPeriodId={academicPeriodId}
        gradeId={gradeId}
        initialValues={{ ...DEFAULTS, ...criteria }}
        subjectOptions={subjectOptions}
        areaOptions={areaOptions}
        curriculumNodes={curriculumNodes}
        subjectLabel={subjectLabel}
      />
    )
    if (!isGradeScope) return form

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold">
              Criterios de promoción{gradeName ? ` de ${gradeName}` : " del grado"}
            </h4>
            {hasOwnChanges && (
              <Badge variant="soft" color="warning" className="border border-current/30">
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
                Con cambios propios
              </Badge>
            )}
          </div>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              color="neutral"
              disabled={!hasOwnChanges || resetMutation.isPending}
              onClick={() => setConfirmReset(true)}
            >
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
              Restablecer a los valores del período
            </Button>
          )}
        </div>
        {readOnly && (
          <p className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
            El Referente de este grado es Formativo: el cierre promueve siempre.
          </p>
        )}
        {form}
        <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-start gap-2">
                <WarningIcon className="mt-0.5 size-6 shrink-0 text-orange" aria-hidden />
                Restablecer los criterios de promoción{gradeName ? ` de ${gradeName}` : ""}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Los criterios de promoción{gradeName ? ` de ${gradeName}` : " del grado"} se
                reemplazarán por los vigentes del período académico
                {periodTitle ? ` ${periodTitle}` : ""}, y el grado volverá a actualizarse con los
                cambios del período.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" color="neutral">
                <XIcon data-icon="inline-start" />
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                color="primary"
                onClick={() => {
                  if (academicPeriodId == null || gradeId == null) return
                  resetMutation.mutate(
                    { academicPeriodId, gradeId },
                    { onSuccess: () => setResetCount((n) => n + 1) },
                  )
                }}
              >
                <ArrowCounterClockwiseIcon data-icon="inline-start" />
                Restablecer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  },
)

interface PromotionCriteriaFormProps {
  hideSubmit: boolean
  readOnly: boolean
  academicPeriodId?: number
  gradeId?: number
  initialValues: PromotionApprovalValues
  subjectOptions: SubjectOption[]
  areaOptions: AreaOption[]
  curriculumNodes: CurriculumNodeOption[]
  subjectLabel: string
}

const PromotionCriteriaForm = forwardRef<PromotionCriteriaHandle, PromotionCriteriaFormProps>(
  function PromotionCriteriaForm(
    {
      hideSubmit,
      readOnly,
      academicPeriodId,
      gradeId,
      initialValues,
      subjectOptions,
      areaOptions,
      curriculumNodes,
      subjectLabel,
    },
    ref,
  ) {
    const subjectLabelPlural = pluralizeSubjectLabel(subjectLabel)
    const isGradeScope = gradeId != null
    const { notify } = useNotify()
    // Nodo elegido que espera confirmación porque vacía las obligatorias.
    const [pendingNode, setPendingNode] = useState<string | null>(null)

    const curriculumNodeItems: Record<string, string> = Object.fromEntries(
      curriculumNodes.map((o) => [o.key, o.label]),
    )

    const updatePromotionCriteria = useUpdatePromotionCriteria({
      mutationConfig: {
        onSuccess: (result) => {
          if (result.status === "error") {
            notify(result.message, { variant: "error" })
            return
          }
          if (!isGradeScope || !hideSubmit) {
            notify(SUCCESS_MESSAGES.promotionCriteria.updated)
          }
        },
      },
    })

    const isSaving = updatePromotionCriteria.isPending

    const form = useAppForm({
      defaultValues: initialValues,
      validators: {
        onSubmit: promotionApprovalSchema,
      },
      onSubmit: async ({ value, formApi }) => {
        if (academicPeriodId == null) {
          notify(SUCCESS_MESSAGES.promotionCriteria.updated)
          return
        }
        await updatePromotionCriteria.mutateAsync({
          academicPeriodId,
          gradeId: isGradeScope ? gradeId : undefined,
          values: value,
        })
        formApi.reset(value)
      },
    })

    useImperativeHandle(
      ref,
      () => ({
        save: async (id: number) => {
          if (!form.state.isDirty || academicPeriodId == null) return
          await form.validateAllFields("submit")
          if (!form.state.isFieldsValid) {
            throw new Error("Revise los criterios de promoción: hay campos con errores.")
          }
          const values = form.state.values
          await updatePromotionCriteria.mutateAsync({ academicPeriodId, gradeId: id, values })
          form.reset(values)
        },
        isDirty: () => form.state.isDirty,
      }),
      [updatePromotionCriteria, form, academicPeriodId],
    )

    const applyAverageApproval = useSelector(
      form.store,
      (state) => state.values.applyAverageApproval,
    )
    const requiredCount = useSelector(form.store, (state) => state.values.requiredSubjects.length)
    const pendingIsArea = pendingNode === "AR"

    function changeNode(next: string) {
      setPendingNode(null)
      form.setFieldValue("curriculumNode", next)
      form.setFieldValue("requiredSubjects", [])
    }

    return (
      <FormDisabledProvider disabled={readOnly}>
        <form
          id={FORM_ID}
          // Base UI ignora <fieldset disabled>: `inert` bloquea los controles propios.
          inert={readOnly || undefined}
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          {!hideSubmit && <NoticeOutlet />}

          {!isGradeScope && (
            <p className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
              Registro único del período: estos valores se actualizan con Guardar. Cada grado puede
              ajustarlos para él en su pestaña Criterios de promoción del grado.
            </p>
          )}

          <FormSection title="Parámetros de aprobación">
            <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
              <form.Field name="curriculumNode">
                {(field) => (
                  <Field variant="outlined">
                    <FieldLabel>
                      Nodo curricular<span className="text-red"> *</span>
                    </FieldLabel>
                    <ComboboxField
                      items={curriculumNodeItems}
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (!value || value === field.state.value) return
                        if (form.state.values.requiredSubjects.length > 0) setPendingNode(value)
                        else field.handleChange(value)
                      }}
                    >
                      <ComboboxFieldTrigger size="sm">
                        <ComboboxFieldValue placeholder="Seleccionar" />
                      </ComboboxFieldTrigger>
                      <ComboboxFieldContent>
                        <ComboboxGroup>
                          {curriculumNodes.map((option) => (
                            <ComboboxFieldItem key={option.key} value={option.key}>
                              {option.label}
                            </ComboboxFieldItem>
                          ))}
                        </ComboboxGroup>
                      </ComboboxFieldContent>
                    </ComboboxField>
                  </Field>
                )}
              </form.Field>

              <form.AppField name="maxFailedRecovery">
                {(field) => (
                  <field.NumberField
                    label="Cantidad máxima reprobadas para nivelar"
                    required
                    valueAs="number"
                    maxDigits={2}
                    max={20}
                  />
                )}
              </form.AppField>

              <div className="md:col-span-2">
                <form.Field name="absencePercentage">
                  {(field) => (
                    <DecimalField
                      suffix="%"
                      field={field}
                      label={`Porcentaje mínimo de inasistencia para reprobar una ${subjectLabel.toLowerCase()}`}
                      required
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </FormSection>

          <FormSection title="Aprobación por rendimiento académico">
            <form.Field name="applyAverageApproval">
              {(field) => (
                <fieldset className="mb-5 flex flex-col gap-2">
                  <legend className="mb-2 text-sm">
                    ¿Aplica la aprobación por rendimiento académico?
                    <span className="text-red"> *</span>
                  </legend>
                  <RadioGroup
                    className="flex items-center gap-6"
                    value={field.state.value ? "si" : "no"}
                    onValueChange={(value) => {
                      const applies = value === "si"
                      field.handleChange(applies)
                      // Con No vuelven a su valor predeterminado (Regla 39).
                      if (!applies) {
                        form.setFieldValue("basePercentage", DEFAULTS.basePercentage)
                        form.setFieldValue(
                          "minimumSubjectPercentage",
                          DEFAULTS.minimumSubjectPercentage,
                        )
                      }
                    }}
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="si" />
                      Sí
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" />
                      No
                    </label>
                  </RadioGroup>
                </fieldset>
              )}
            </form.Field>

            <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
              <form.Field name="basePercentage">
                {(field) => (
                  <DecimalField
                    suffix="%"
                    field={field}
                    label="Porcentaje base"
                    required={applyAverageApproval}
                    disabled={!applyAverageApproval}
                    description={applyAverageApproval ? undefined : "Se habilita con Sí."}
                  />
                )}
              </form.Field>
              <form.Field name="minimumSubjectPercentage">
                {(field) => (
                  <DecimalField
                    suffix="%"
                    field={field}
                    label={`Porcentaje mínimo de Área/${subjectLabel}`}
                    required={applyAverageApproval}
                    disabled={!applyAverageApproval}
                    description={applyAverageApproval ? undefined : "Se habilita con Sí."}
                  />
                )}
              </form.Field>
            </div>
          </FormSection>

          <FormSection title={`Área/${subjectLabelPlural} obligatorias para la aprobación`}>
            <form.Field name="requiredSubjects">
              {(field) => (
                <form.Subscribe selector={(state) => state.values.curriculumNode}>
                  {(curriculumNode) => {
                    const esArea = curriculumNode === "AR"
                    return (
                      <RequiredSubjectsField
                        field={field}
                        mode={esArea ? "AR" : "AS"}
                        areas={areaOptions}
                        subjects={subjectOptions}
                        emptyMessage={
                          esArea
                            ? "El período aún no tiene áreas."
                            : `El período aún no tiene ${subjectLabelPlural.toLowerCase()}.`
                        }
                      />
                    )
                  }}
                </form.Subscribe>
              )}
            </form.Field>
          </FormSection>

          {!isGradeScope && (
            <FormSection title="Requisitos de grado (último grado de la Media)">
              <form.Field name="complementaryRequired">
                {(complementary) => (
                  <form.Field name="normRequirements">
                    {(norm) => (
                      <form.Field name="ownRequirements">
                        {(own) => (
                          <GradeRequirementsField
                            complementary={complementary}
                            norm={norm}
                            own={own}
                          />
                        )}
                      </form.Field>
                    )}
                  </form.Field>
                )}
              </form.Field>
            </FormSection>
          )}

          {!hideSubmit && (
            <div className="flex justify-end">
              <form.Subscribe selector={(state) => state.isDirty}>
                {(isDirty) =>
                  isDirty ? (
                    <Button type="submit" color="primary" size="sm" disabled={isSaving}>
                      {isSaving ? "Guardando..." : "Guardar"}
                    </Button>
                  ) : null
                }
              </form.Subscribe>
            </div>
          )}

          <AlertDialog
            open={pendingNode != null}
            onOpenChange={(open) => !open && setPendingNode(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cambiar el Nodo curricular</AlertDialogTitle>
                <AlertDialogDescription>
                  Se quitarán {requiredCount === 1 ? "la" : `las ${requiredCount}`} obligatoria
                  {requiredCount === 1 ? "" : "s"} para la aprobación elegida
                  {requiredCount === 1 ? "" : "s"}, porque ahora se eligen{" "}
                  {pendingIsArea ? "áreas" : subjectLabelPlural.toLowerCase()}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel variant="fill" color="neutral">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  color="primary"
                  onClick={() => pendingNode && changeNode(pendingNode)}
                >
                  Cambiar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      </FormDisabledProvider>
    )
  },
)

function RequiredSubjectsField({
  field,
  mode,
  areas,
  subjects,
  emptyMessage,
}: {
  field: AnyFieldApi
  mode: "AR" | "AS"
  areas: AreaOption[]
  subjects: SubjectOption[]
  emptyMessage: string
}) {
  // Quita las que ya no están en el catálogo del período (Regla 41).
  useEffect(() => {
    const validIds = new Set((mode === "AR" ? areas : subjects).map((o) => o.id))
    const current = field.state.value as number[]
    const valid = current.filter((id) => validIds.has(id))
    if (valid.length !== current.length) field.handleChange(valid)
  }, [mode, areas, subjects, field])

  return (
    <RequiredCurriculumSelect
      mode={mode}
      areas={areas}
      subjects={subjects}
      value={field.state.value as number[]}
      onChange={(values) => field.handleChange(values)}
      emptyMessage={emptyMessage}
    />
  )
}

// Requisitos de grado (Regla 105): los de la norma se marcan en la lista y los
// propios (3 a 80 caracteres, únicos, hasta 10) se escriben abajo y quedan
// marcados; desmarcar uno propio lo quita. Lo marcado se ve como chips.
const COMPLEMENTARY_KEY = "__complementaria__"

interface RequirementRow {
  key: string
  label: string
  checked: boolean
  kind: "norm" | "complementary" | "own"
}

function GradeRequirementsField({
  complementary,
  norm,
  own,
}: {
  complementary: AnyFieldApi
  norm: AnyFieldApi
  own: AnyFieldApi
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const normValue = norm.state.value as string[]
  const ownItems = own.state.value as string[]
  const isFull = ownItems.length >= PROMOTION_REQUIREMENTS_MAX

  // Orden de la lista: la norma, la complementaria y luego los propios.
  const rows: RequirementRow[] = [
    ...NORM_REQUIREMENTS.map((r) => ({
      key: r.code,
      label: r.label,
      checked: normValue.includes(r.code),
      kind: "norm" as const,
    })),
    {
      key: COMPLEMENTARY_KEY,
      label: "Aprobar la formación de la matrícula complementaria",
      checked: Boolean(complementary.state.value),
      kind: "complementary",
    },
    ...ownItems.map((item) => ({
      key: `own:${item}`,
      label: item,
      checked: true,
      kind: "own" as const,
    })),
  ]
  const selected = rows.filter((r) => r.checked)

  function toggle(row: RequirementRow, checked: boolean) {
    if (row.kind === "norm") {
      norm.handleChange(checked ? [...normValue, row.key] : normValue.filter((c) => c !== row.key))
    } else if (row.kind === "complementary") {
      complementary.handleChange(checked)
    } else if (!checked) {
      own.handleChange(ownItems.filter((i) => i !== row.label))
    }
  }

  function add() {
    const name = draft.trim()
    if (name.length < 3 || name.length > 80) {
      setError("El requisito debe tener entre 3 y 80 caracteres.")
      return
    }
    if (rows.some((r) => r.label.trim().toLowerCase() === name.toLowerCase())) {
      setError("Ya existe un requisito con ese nombre.")
      return
    }
    own.handleChange([...ownItems, name])
    setDraft("")
    setError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">Requisitos de grado</span>
      <div className="rounded-md border border-input">
        <div className="flex items-start gap-2 px-3 py-2">
          <div className="flex min-h-7 flex-1 flex-wrap items-center gap-2">
            {selected.length === 0 ? (
              <span className="text-sm text-muted-foreground">Ninguno</span>
            ) : (
              selected.map((row) => (
                <Badge key={row.key} variant="soft" color="info" className="gap-1 pr-1">
                  {row.label}
                  <button
                    type="button"
                    aria-label={`Quitar ${row.label}`}
                    onClick={() => toggle(row, false)}
                    className="grid size-5 place-items-center rounded-full opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Ocultar requisitos" : "Ver requisitos"}
            onClick={() => setOpen((v) => !v)}
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CaretDownIcon className={cn("size-5 transition-transform", open && "rotate-180")} />
          </button>
        </div>

        {open && (
          <div className="border-t border-input">
            <ul className="flex flex-col py-1">
              {rows.map((row) => (
                <li key={row.key}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                    <Checkbox
                      checked={row.checked}
                      onCheckedChange={(checked) => toggle(row, Boolean(checked))}
                    />
                    {row.label}
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1 border-t border-input p-3">
              <div className="flex items-start gap-2">
                <Field
                  variant="outlined"
                  className="flex-1"
                  data-invalid={error ? true : undefined}
                >
                  <FieldLabel htmlFor="own-requirement">Requisito propio</FieldLabel>
                  <div className="relative">
                    <Input
                      id="own-requirement"
                      placeholder="Escriba un requisito..."
                      maxLength={80}
                      disabled={isFull}
                      value={draft}
                      aria-invalid={error ? true : undefined}
                      className="pr-16"
                      onChange={(e) => {
                        setDraft(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          add()
                        }
                      }}
                    />
                    <CharacterCounter
                      value={draft}
                      max={80}
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                    />
                  </div>
                </Field>
                <Button type="button" color="primary" disabled={isFull} onClick={add} className="h-10">
                  <PlusIcon data-icon="inline-start" />
                  Agregar
                </Button>
              </div>
              {error ? (
                <p className="text-sm text-red">{error}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isFull
                    ? `Ya tiene los ${PROMOTION_REQUIREMENTS_MAX} requisitos propios permitidos.`
                    : "No puede ser un requisito de pago."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
