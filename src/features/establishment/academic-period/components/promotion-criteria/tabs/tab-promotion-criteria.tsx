import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { AnyFieldApi } from "@tanstack/react-form"
import { useForm } from "@tanstack/react-form"

import { useNotify, NoticeOutlet } from "../../common/notice-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldLabel } from "@/components/ui/field"

import { usePromotionCriteriaQuery } from "../../../api/query/promotion-criteria/use-promotion-criteria-query"
import { useUpdatePromotionCriteria } from "../../../api/mutations/promotion-criteria/update-promotion-criteria"
import { useGradeConfigQuery } from "../../../api/query/use-grade-config-query"
import { useUpdateGradeConfig } from "../../../api/mutations/update-grade-config"
import { useSubjectsQuery } from "../../../api/query/area-subjects/use-subjects-query"
import { useCurriculumNodesQuery } from "../../../api/query/use-curriculum-nodes-query"
import type { CurriculumNodeOption } from "../../../api/types/curriculum-node"
import { SubjectsMultiSelect } from "../subjects-multi-select"
import {
  promotionApprovalSchema,
  type PromotionApprovalValues,
} from "../../../api/schema"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"

const EMPTY: PromotionApprovalValues = {
  curriculumNode: "",

  maxFailedRecovery: 0,
  absencePercentage: 0,
  maxLeveledSubjects: 0,

  applyAverageApproval: true,

  basePercentage: 25,
  minimumSubjectPercentage: 25,
  maxFailedForAverage: 5,

  requiredSubjects: [],
}

const FORM_ID = "approval-parameters-form"

interface TabPromotionCriteriaProps {
  hideSubmit?: boolean
  academicPeriodId?: number
  gradeId?: number
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}

export interface PromotionCriteriaHandle {
  save: (gradeId: number) => Promise<void>
}

export const TabPromotionCriteria = forwardRef<
  PromotionCriteriaHandle,
  TabPromotionCriteriaProps
>(function TabPromotionCriteria(
  { hideSubmit = false, academicPeriodId, gradeId, headingLevel = 3 },
  ref
) {
  const isGradeScope = gradeId != null

  const { data: periodCriteria, isPending: periodLoading } =
    usePromotionCriteriaQuery(academicPeriodId)

  const { data: gradeConfig, isPending: gradeLoading } = useGradeConfigQuery(
    isGradeScope ? gradeId : undefined
  )

  const criteria = isGradeScope
    ? (gradeConfig?.promotionCriteria ?? periodCriteria)
    : periodCriteria
  const isLoading = isGradeScope
    ? gradeLoading || (academicPeriodId != null && periodLoading)
    : periodLoading

  const { data: subjectOptions = [] } = useSubjectsQuery(academicPeriodId)

  const { data: curriculumNodes = [], isPending: isLoadingCurriculumNodes } =
    useCurriculumNodesQuery()

  if (
    ((isGradeScope || academicPeriodId != null) && isLoading) ||
    isLoadingCurriculumNodes
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
      curriculumNodes={curriculumNodes}
    />
  )
})

interface PromotionCriteriaFormProps {
  hideSubmit: boolean
  academicPeriodId?: number
  gradeId?: number
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6
  initialValues: PromotionApprovalValues
  subjectOptions: string[]
  curriculumNodes: CurriculumNodeOption[]
}

const PromotionCriteriaForm = forwardRef<
  PromotionCriteriaHandle,
  PromotionCriteriaFormProps
>(function PromotionCriteriaForm(
  {
    hideSubmit,
    academicPeriodId,
    gradeId,
    headingLevel,
    initialValues,
    subjectOptions,
    curriculumNodes,
  },
  ref
) {
  const HeadingTag = `h${headingLevel}` as const
  const isGradeScope = gradeId != null
  const { notify } = useNotify()

  // `items` mapea cada `value` al label que `SelectValue` renderiza solo. Se
  // arma desde las opciones del back (`key` → `label`).
  const curriculumNodeItems = useMemo<Record<string, string>>(
    () => Object.fromEntries(curriculumNodes.map((o) => [o.key, o.label])),
    [curriculumNodes]
  )

  const savePeriodCriteria = useUpdatePromotionCriteria({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.promotionCriteria.updated)
      },
    },
  })

  const saveGradeConfig = useUpdateGradeConfig({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        if (!hideSubmit) notify(SUCCESS_MESSAGES.promotionCriteria.updated)
      },
    },
  })

  const isSaving = isGradeScope
    ? saveGradeConfig.isPending
    : savePeriodCriteria.isPending

  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: promotionApprovalSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (isGradeScope && gradeId != null) {
        saveGradeConfig.mutate({ gradeId, values: { promotionCriteria: value } })
        return
      }
      if (academicPeriodId != null) {
        await savePeriodCriteria.mutateAsync({ academicPeriodId, values: value })
        formApi.reset(value)
        return
      }
      notify(SUCCESS_MESSAGES.promotionCriteria.updated)
    },
  })

  useImperativeHandle(
    ref,
    () => ({
      save: async (id: number) => {
        if (!form.state.isDirty) return
        await saveGradeConfig.mutateAsync({
          gradeId: id,
          values: { promotionCriteria: form.state.values },
        })
      },
    }),
    [saveGradeConfig, form]
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
      <HeadingTag className="mb-4 text-lg font-semibold">
        Parámetros de aprobación
      </HeadingTag>

      <div className="grid gap-4 md:grid-cols-2">

        <form.Field name="curriculumNode">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel className="flex-1">Nodo curricular*</FieldLabel>

              <Select
                items={curriculumNodeItems}
                value={field.state.value}
                onValueChange={(value) => value && field.handleChange(value)}
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {curriculumNodes.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="maxFailedRecovery">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel className="flex-1">
                Cantidad máxima reprobadas para nivelar*
              </FieldLabel>

              <Input
                type="number"
                min={0}
                placeholder="Ingrese un valor"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
                className="h-9"
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

              <Input
                type="number"
                min={0}
                placeholder="Ingrese un valor"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
                className="h-9"
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
                placeholder="Ingrese un valor"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
                className="h-9"
              />
            </Field>
          )}
        </form.Field>

      </div>

      <HeadingTag className="mt-8 mb-4 text-lg font-semibold">
        Aprobación por promedio
      </HeadingTag>

      <div className="grid gap-4 md:grid-cols-2">

        <form.Field name="applyAverageApproval">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel>
                ¿Aplica la aprobación por promedio?*
              </FieldLabel>

              <RadioGroup
                className="flex min-h-10 items-center gap-6 rounded-md border border-input px-3"
                value={field.state.value ? "si" : "no"}
                onValueChange={(value) =>
                  field.handleChange(value === "si")
                }
              >
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="si" />
                  Sí
                </label>

                <label className="flex items-center gap-2">
                  <RadioGroupItem value="no" />
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

              <Input
                type="number"
                min={0}
                placeholder="Ingrese un valor"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
                className="h-9"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="minimumSubjectPercentage">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel className="flex-1">
                Porcentaje mínimo de Área/Asignatura*
              </FieldLabel>

              <Input
                type="number"
                min={0}
                placeholder="Ingrese un valor"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
                className="h-9"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="maxFailedForAverage">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel className="flex-1">
                Cantidad máxima de asignaturas reprobadas para considerar la aprobación por promedio*
              </FieldLabel>

              <Input
                type="number"
                min={0}
                placeholder="Ingrese un valor"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
                className="h-9"
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
          <RequiredSubjectsField field={field} subjectOptions={subjectOptions} />
        )}
      </form.Field>

      {!hideSubmit && (
        <div className="mt-8 flex justify-end">
          <form.Subscribe selector={(state) => state.isDirty}>
            {(isDirty) =>
              isDirty ? (
                <Button
                  type="submit"
                  color="primary"
                  size="sm"
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              ) : null
            }
          </form.Subscribe>
        </div>
      )}
    </form>
  )
})

interface RequiredSubjectsFieldProps {
  field: AnyFieldApi
  subjectOptions: string[]
}

function RequiredSubjectsField({
  field,
  subjectOptions,
}: RequiredSubjectsFieldProps) {
  useEffect(() => {
    const current = field.state.value as string[]
    const valid = current.filter((v) => subjectOptions.includes(v))
    if (valid.length !== current.length) {
      field.handleChange(valid)
    }
  }, [subjectOptions, field])

  return (
    <Field variant="outlined" className="max-w-xl">
      <FieldLabel>
        Áreas/Asignaturas obligatorias para la aprobación
      </FieldLabel>
      <SubjectsMultiSelect
        options={subjectOptions}
        value={field.state.value}
        onChange={(values) => field.handleChange(values)}
      />
    </Field>
  )
}
