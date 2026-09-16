import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { AnyFieldApi } from "@tanstack/react-form"
import { useForm, useSelector } from "@tanstack/react-form"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldLabel } from "@/components/ui/field"

import { usePromotionCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-promotion-criteria"
import { useUpdatePromotionCriteria } from "@/features/establishment/academic-period/api/mutations/update-promotion-criteria"
import { useSubjectsQuery, type SubjectOption } from "@/features/establishment/academic-period/api/query/use-subjects"
import { usePeriodAreasQuery, type AreaOption } from "@/features/establishment/academic-period/api/query/use-period-areas"
import { useCurriculumNodesQuery } from "@/features/establishment/academic-period/api/query/use-curriculum-nodes"
import type { CurriculumNodeOption } from "@/features/establishment/academic-period/api/types/curriculum-node"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/subjects-multi-select"
import {
  promotionApprovalSchema,
  type PromotionApprovalValues,
} from "@/features/establishment/academic-period/api/schema"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const EMPTY: PromotionApprovalValues = {
  curriculumNode: "AS",

  maxFailedRecovery: 2,
  absencePercentage: 25,
  maxLeveledSubjects: 2,

  applyAverageApproval: false,

  basePercentage: 25,
  minimumSubjectPercentage: 25,
  maxFailedForAverage: 5,

  requiredSubjects: [],
}

const FORM_ID = "approval-parameters-form"

function PercentInput({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <InputGroup className="h-11 rounded-md border border-input px-3 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
      <InputGroupInput
        type="number"
        min={0}
        max={100}
        placeholder="Agregar"
        className="px-0"
        value={Number.isNaN(value) ? "" : value}
        disabled={disabled}
        onKeyDown={(event) => {
          if (["-", "+", "e", "E"].includes(event.key)) {
            event.preventDefault()
          }
        }}
        onChange={(event) => {
          const raw = event.target.value
          const parsed = Number(raw)
          if (raw === "" || !Number.isNaN(parsed)) onChange(parsed)
        }}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>%</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}

interface TabPromotionCriteriaProps {
  hideSubmit?: boolean
  academicPeriodId?: number
  gradeId?: number
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}

export interface PromotionCriteriaHandle {
  save: (gradeId: number) => Promise<void>
}

export const TabPromotionCriteria = forwardRef<PromotionCriteriaHandle, TabPromotionCriteriaProps>(
  function TabPromotionCriteria(
    { hideSubmit = false, academicPeriodId, gradeId, headingLevel = 3 },
    ref,
  ) {
    const isGradeScope = gradeId != null

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

    return (
      <PromotionCriteriaForm
        key={isGradeScope ? `grade-${gradeId}` : `period-${academicPeriodId ?? "new"}`}
        ref={ref}
        hideSubmit={hideSubmit}
        academicPeriodId={academicPeriodId}
        gradeId={gradeId}
        headingLevel={headingLevel}
        initialValues={criteria ?? EMPTY}
        subjectOptions={subjectOptions}
        areaOptions={areaOptions}
        curriculumNodes={curriculumNodes}
      />
    )
  },
)

interface PromotionCriteriaFormProps {
  hideSubmit: boolean
  academicPeriodId?: number
  gradeId?: number
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6
  initialValues: PromotionApprovalValues
  subjectOptions: SubjectOption[]
  areaOptions: AreaOption[]
  curriculumNodes: CurriculumNodeOption[]
}

const PromotionCriteriaForm = forwardRef<PromotionCriteriaHandle, PromotionCriteriaFormProps>(
  function PromotionCriteriaForm(
    {
      hideSubmit,
      academicPeriodId,
      gradeId,
      headingLevel,
      initialValues,
      subjectOptions,
      areaOptions,
      curriculumNodes,
    },
    ref,
  ) {
    const HeadingTag = `h${headingLevel}` as const
    const isGradeScope = gradeId != null
    const { notify } = useNotify()

    const curriculumNodeItems = useMemo<Record<string, string>>(
      () => Object.fromEntries(curriculumNodes.map((o) => [o.key, o.label])),
      [curriculumNodes],
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

    const form = useForm({
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
          await updatePromotionCriteria.mutateAsync({
            academicPeriodId,
            gradeId: id,
            values: form.state.values,
          })
        },
      }),
      [updatePromotionCriteria, form, academicPeriodId],
    )

    const maxFailedRecovery = useSelector(form.store, (state) => state.values.maxFailedRecovery)
    useEffect(() => {
      if (form.state.values.maxLeveledSubjects > maxFailedRecovery) {
        form.setFieldValue("maxLeveledSubjects", maxFailedRecovery)
      }
    }, [maxFailedRecovery, form])

    const applyAverageApproval = useSelector(
      form.store,
      (state) => state.values.applyAverageApproval,
    )

    return (
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        {!hideSubmit && <NoticeOutlet className="mb-4" />}
        <HeadingTag className="mb-4 text-lg font-semibold">Parámetros de aprobación</HeadingTag>

        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="curriculumNode">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel className="flex-1">Nodo curricular*</FieldLabel>

                <ComboboxField
                  items={curriculumNodeItems}
                  value={field.state.value}
                  onValueChange={(value) => value && field.handleChange(value)}
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

          <form.Field name="maxFailedRecovery">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel className="flex-1">Cantidad máxima reprobadas para nivelar*</FieldLabel>

                <Input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  placeholder="Agregar"
                  value={field.state.value}
                  onKeyDown={(e) => {
                    if (["-", "+", ".", ",", "e", "E"].includes(e.key)) e.preventDefault()
                  }}
                  onChange={(e) => {
                    const raw = e.target.value
                    const parsed = Number(raw)
                    if (raw === "" || !Number.isNaN(parsed)) field.handleChange(Math.min(parsed, 99))
                  }}
                  className="h-11"
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="absencePercentage">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel className="flex-1">
                  Porcentaje mínimo de inasistencia para reprobar una asignatura*
                </FieldLabel>

                <PercentInput
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="maxLeveledSubjects">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel className="flex-1">
                  Máximo de Áreas/Asignaturas niveladas para ser promovido*
                </FieldLabel>

                <Input
                  type="number"
                  min={0}
                  max={maxFailedRecovery}
                  step={1}
                  placeholder="Agregar"
                  value={field.state.value}
                  onKeyDown={(e) => {
                    if (["-", "+", ".", ",", "e", "E"].includes(e.key)) e.preventDefault()
                  }}
                  onChange={(e) => {
                    const raw = e.target.value
                    const parsed = Number(raw)
                    if (raw === "" || !Number.isNaN(parsed)) {
                      field.handleChange(Math.min(parsed, maxFailedRecovery))
                    }
                  }}
                  className="h-11"
                />
              </Field>
            )}
          </form.Field>
        </div>

        <HeadingTag className="mt-8 mb-4 text-lg font-semibold">Aprobación por promedio</HeadingTag>

        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="applyAverageApproval">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel>¿Aplica la aprobación por promedio?*</FieldLabel>

                <RadioGroup
                  className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
                  value={field.state.value ? "si" : "no"}
                  onValueChange={(value) => field.handleChange(value === "si")}
                >
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="si" className="data-checked:bg-primary" />
                    Sí
                  </label>

                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="no" className="data-checked:bg-primary" />
                    No
                  </label>
                </RadioGroup>
              </Field>
            )}
          </form.Field>

          <form.Field name="basePercentage">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel className="flex-1">Porcentaje base*</FieldLabel>

                <PercentInput
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  disabled={!applyAverageApproval}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="minimumSubjectPercentage">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel className="flex-1">Porcentaje mínimo de Área/Asignatura*</FieldLabel>

                <PercentInput
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  disabled={!applyAverageApproval}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="maxFailedForAverage">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel className="flex-1">
                  Cantidad máxima de asignaturas reprobadas para considerar la aprobación por
                  promedio*
                </FieldLabel>

                <Input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  placeholder="Agregar"
                  value={field.state.value}
                  disabled={!applyAverageApproval}
                  onKeyDown={(e) => {
                    if (["-", "+", ".", ",", "e", "E"].includes(e.key)) e.preventDefault()
                  }}
                  onChange={(e) => {
                    const raw = e.target.value
                    const parsed = Number(raw)
                    if (raw === "" || !Number.isNaN(parsed)) field.handleChange(Math.min(parsed, 99))
                  }}
                  className="h-11"
                />
              </Field>
            )}
          </form.Field>
        </div>

        <HeadingTag className="mt-8 mb-4 text-lg font-semibold">
          Áreas/Asignaturas obligatorias para aprobación
        </HeadingTag>

        <form.Field name="requiredSubjects">
          {(field) => (
            <form.Subscribe selector={(state) => state.values.curriculumNode}>
              {(curriculumNode) => (
                <RequiredSubjectsField
                  field={field}
                  options={curriculumNode === "AR" ? areaOptions : subjectOptions}
                />
              )}
            </form.Subscribe>
          )}
        </form.Field>

        {!hideSubmit && (
          <div className="mt-8 flex justify-end">
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
      </form>
    )
  },
)

interface RequiredSubjectsFieldProps {
  field: AnyFieldApi
  options: SubjectOption[] | AreaOption[]
}

function RequiredSubjectsField({ field, options }: RequiredSubjectsFieldProps) {
  useEffect(() => {
    const validIds = new Set(options.map((o) => o.id))
    const current = field.state.value as number[]
    const valid = current.filter((id) => validIds.has(id))
    if (valid.length !== current.length) {
      field.handleChange(valid)
    }
  }, [options, field])

  return (
    <Field variant="outlined" className="max-w-xl">
      <FieldLabel>Áreas/Asignaturas obligatorias para la aprobación</FieldLabel>
      <SubjectsMultiSelect
        options={options}
        value={field.state.value}
        onChange={(values) => field.handleChange(values)}
      />
    </Field>
  )
}
