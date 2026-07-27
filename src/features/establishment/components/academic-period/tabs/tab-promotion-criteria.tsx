import { useEffect } from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldLabel } from "@/components/ui/field"

import { usePromotionCriteriaQuery } from "../../../api/query/use-promotion-criteria-query"
import { useUpdatePromotionCriteria } from "../../../api/mutations/update-promotion-criteria"
import { useGradeConfigQuery } from "../../../api/query/use-grade-config-query"
import { useUpdateGradeConfig } from "../../../api/mutations/update-grade-config"
import { useAreaSubjectQuery } from "../../../api/query/use-area-subject"
import { SubjectsMultiSelect } from "../subjects-multi-select"
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

const SELECT_FIELDS = [
  {
    name: "curriculumNode",
    label: "Nodo curricular*",
    options: [
      "Preescolar",
      "Primaria",
      "Secundaria",
      "Media",
    ],
  },
] as const

const approvalSchema = z.object({
  curriculumNode: z.string().min(1, "Requerido"),

  maxFailedRecovery: z.number().min(0),
  absencePercentage: z.number().min(0),
  maxLeveledSubjects: z.number().min(0),
  maxFailedSubjects: z.number().min(0),

  applyAverageApproval: z.boolean(),

  basePercentage: z.number().min(0),
  minimumSubjectPercentage: z.number().min(0),
  maxFailedForAverage: z.number().min(0),

  requiredSubjects: z.array(z.string()),
})

type ApprovalValues = z.infer<typeof approvalSchema>

const EMPTY: ApprovalValues = {
  curriculumNode: "",

  maxFailedRecovery: 0,
  absencePercentage: 0,
  maxLeveledSubjects: 0,
  maxFailedSubjects: 0,

  applyAverageApproval: true,

  basePercentage: 25,
  minimumSubjectPercentage: 25,
  maxFailedForAverage: 5,

  requiredSubjects: [],
}

const FORM_ID = "approval-parameters-form"

interface TabPromotionCriteriaProps {
  hideSubmit?: boolean
  // Ámbito de los criterios: por grado (dentro del diálogo del grado) o por
  // periodo (pestaña del periodo). Se prioriza el grado si viene.
  academicPeriodId?: number
  gradeId?: number
}

export function TabPromotionCriteria({
  hideSubmit = false,
  academicPeriodId,
  gradeId,
}: TabPromotionCriteriaProps) {
  const isGradeScope = gradeId != null

  // Criterios por periodo (pestaña del periodo).
  const { data: periodCriteria, isPending: periodLoading } =
    usePromotionCriteriaQuery(isGradeScope ? undefined : academicPeriodId)

  // Criterios por grado (dentro del diálogo del grado).
  const { data: gradeConfig, isPending: gradeLoading } = useGradeConfigQuery(
    isGradeScope ? gradeId : undefined
  )

  const criteria = isGradeScope ? gradeConfig?.promotionCriteria : periodCriteria
  const isLoading = isGradeScope ? gradeLoading : periodLoading

  // Opciones de "áreas/asignaturas obligatorias" = las del periodo.
  const { data: areaData } = useAreaSubjectQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    academicPeriodId,
  })
  const subjectOptions = (areaData?.rows ?? []).map((area) => area.nombreInterno)

  const savePeriodCriteria = useUpdatePromotionCriteria({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
      },
    },
  })

  const saveGradeConfig = useUpdateGradeConfig({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
      },
    },
  })

  const isSaving = isGradeScope
    ? saveGradeConfig.isPending
    : savePeriodCriteria.isPending

  const form = useForm({
    defaultValues: EMPTY,
    validators: {
      onSubmit: approvalSchema,
    },
    onSubmit: ({ value }) => {
      if (isGradeScope && gradeId != null) {
        saveGradeConfig.mutate({ gradeId, values: { promotionCriteria: value } })
        return
      }
      if (academicPeriodId != null) {
        savePeriodCriteria.mutate({ academicPeriodId, values: value })
        return
      }
      toast.success("Parámetros guardados.")
    },
  })

  useEffect(() => {
    if (criteria) form.reset(criteria)
  }, [criteria, form])

  if ((isGradeScope || academicPeriodId != null) && isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  return (
    <form
      id={FORM_ID}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <h3 className="mb-4 text-lg font-semibold">
        Parámetros de aprobación
      </h3>

      <div className="grid gap-4 md:grid-cols-2">

        <form.Field name="curriculumNode">
          {(field) => (
            <Field>
              <FieldLabel className="flex-1">Nodo curricular*</FieldLabel>

              <Select
                value={field.state.value}
                onValueChange={(value) => value && field.handleChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {SELECT_FIELDS[0].options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
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
            <Field>
              <FieldLabel className="flex-1">
                Cantidad máxima reprobadas para nivelar*
              </FieldLabel>

              <Input
                type="number"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="absencePercentage">
          {(field) => (
            <Field>
              <FieldLabel className="flex-1">
                Porcentaje mínimo de inasistencia para reprobar una asignatura*
              </FieldLabel>

              <Input
                type="number"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="maxLeveledSubjects">
          {(field) => (
            <Field>
              <FieldLabel className="flex-1">
                Máximo de Áreas/Asignaturas niveladas para ser promovido*
              </FieldLabel>

              <Input
                type="number"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="maxFailedSubjects">
          {(field) => (
            <Field>
              <FieldLabel className="flex-1">
                Máximo de áreas/asignaturas reprobadas para ser promovido
              </FieldLabel>

              <Input
                type="number"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
              />
            </Field>
          )}
        </form.Field>

      </div>

      <h3 className="mt-8 mb-4 text-lg font-semibold">
        Aprobación por promedio
      </h3>

      <div className="grid gap-4 md:grid-cols-2">

        <form.Field name="applyAverageApproval">
          {(field) => (
            <Field>
              <FieldLabel className="flex-1">
                ¿Aplica la aprobación por promedio?*
              </FieldLabel>

              <RadioGroup
                className="flex gap-6 pt-2"
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
            <Field>
              <FieldLabel className="flex-1">Porcentaje base*</FieldLabel>

              <Input
                type="number"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="minimumSubjectPercentage">
          {(field) => (
            <Field>
              <FieldLabel className="flex-1">
                Porcentaje mínimo de Área/Asignatura*
              </FieldLabel>

              <Input
                type="number"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="maxFailedForAverage">
          {(field) => (
            <Field>
              <FieldLabel className="flex-1">
                Cantidad máxima de asignaturas reprobadas para considerar la aprobación por promedio*
              </FieldLabel>

              <Input
                type="number"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(Number(e.target.value))
                }
              />
            </Field>
          )}
        </form.Field>

      </div>

      <h3 className="mt-8 mb-4 text-lg font-semibold">
        Áreas/Asignaturas obligatorias para aprobación
      </h3>

      <form.Field name="requiredSubjects">
        {(field) => (
          <Field className="max-w-xl">
            <FieldLabel>
              Áreas/Asignaturas obligatorias para la aprobación
            </FieldLabel>
            <SubjectsMultiSelect
              options={subjectOptions}
              value={field.state.value}
              onChange={(values) => field.handleChange(values)}
            />
          </Field>
        )}
      </form.Field>

      {!hideSubmit && (
        <div className="mt-6 flex justify-end">
          <Button type="submit" color="primary" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      )}
    </form>
  )
}