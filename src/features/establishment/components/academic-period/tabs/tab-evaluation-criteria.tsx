import { useEffect } from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"

import { useEvaluationCriteriaQuery } from "../../../api/query/use-evaluation-criteria-query"
import { useEvaluationCriteriaOptionsQuery } from "../../../api/query/use-evaluation-criteria-options-query"
import { useUpdateEvaluationCriteria } from "../../../api/mutations/update-evaluation-criteria"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const FIELDS = [
  {
    name: "gradingScale",
    label: "Escala de valoración*",
  },
  {
    name: "gradingFormat",
    label: "Formato de calificación para la asignatura*",
  },
  {
    name: "studentWithoutGradesPerformance",
    label: "Desempeño cuando un estudiante no tiene calificaciones*",
  },
  {
    name: "initialGrade",
    label: "Nota inicial para las calificaciones*",
  },
  {
    name: "maxRecoveryGrade",
    label: "Nota máxima para las recuperaciones y nivelaciones*",
  },
  {
    name: "roundingMode",
    label: "Modo en que la aplicación debe redondear los dígitos*",
  },
  {
    name: "periodCalculationElements",
    label: "Elementos para calcular la nota definitiva del período*",
  },
  {
    name: "subjectGradeCriteria",
    label: "Criterio para calcular la nota de la asignatura*",
  },
  {
    name: "areaGradeCriteria",
    label: "Criterio para calcular la nota del área*",
  },
  {
    name: "finalGradeCriteria",
    label:
      "Criterio para calcular la nota final entre los períodos de evaluación*",
  },
] as const

const evaluationCriteriaSchema = z.object({
  gradingFormat: z.string().min(1, "Requerido"),
  gradingScale: z.string().min(1, "Requerido"),
  periodCalculationElements: z.string().min(1, "Requerido"),
  subjectGradeCriteria: z.string().min(1, "Requerido"),
  finalGradeCriteria: z.string().min(1, "Requerido"),
  areaGradeCriteria: z.string().min(1, "Requerido"),
  studentWithoutGradesPerformance: z.string().min(1, "Requerido"),
  maxRecoveryGrade: z.string().min(1, "Requerido"),
  roundingMode: z.string().min(1, "Requerido"),
  initialGrade: z.string().min(1, "Requerido"),
})
type EvaluationCriteriaValues = z.infer<typeof evaluationCriteriaSchema>

const EMPTY: EvaluationCriteriaValues = {
  gradingFormat: "",
  gradingScale: "",
  periodCalculationElements: "",
  subjectGradeCriteria: "",
  finalGradeCriteria: "",
  areaGradeCriteria: "",
  studentWithoutGradesPerformance: "",
  maxRecoveryGrade: "",
  roundingMode: "",
  initialGrade: "",
}

const FORM_ID = "evaluation-criteria-form"

interface TabEvaluationCriteriaProps {
  academicPeriodId?: number
}

export function TabEvaluationCriteria({
  academicPeriodId,
}: TabEvaluationCriteriaProps) {
  const { data: criteria, isPending: isLoading } =
    useEvaluationCriteriaQuery(academicPeriodId)

  const { data: options, isPending: isLoadingOptions } =
    useEvaluationCriteriaOptionsQuery()

  const saveCriteria = useUpdateEvaluationCriteria({
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

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onSubmit: evaluationCriteriaSchema },
    onSubmit: ({ value }) => {
      if (academicPeriodId != null) {
        saveCriteria.mutate({ academicPeriodId, values: value })
        return
      }
      toast.success("Criterios de evaluación guardados.")
    },
  })

  // Al cargar los criterios del periodo, prellenamos el formulario con ellos.
  useEffect(() => {
    if (criteria) form.reset(criteria)
  }, [criteria, form])

  if ((academicPeriodId != null && isLoading) || isLoadingOptions) {
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
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((cfg) => (
          <form.Field key={cfg.name} name={cfg.name}>
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name} className="flex-1">
                    {cfg.label}
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => value && field.handleChange(value)}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                    >
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(options?.[cfg.name] ?? []).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" color="primary" disabled={saveCriteria.isPending}>
          {saveCriteria.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  )
}
