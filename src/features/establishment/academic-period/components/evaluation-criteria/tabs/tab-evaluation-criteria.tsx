import { useEffect, useMemo } from "react"
import { useForm } from "@tanstack/react-form"

import { useNotify, NoticeOutlet } from "../../common/notice-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"

import { useEvaluationCriteriaQuery } from "../../../api/query/evaluation-criteria/use-evaluation-criteria-query"
import { useEvaluationCriteriaOptionsQuery } from "../../../api/query/evaluation-criteria/use-evaluation-criteria-options-query"
import { useRatingScalesQuery } from "../../../api/query/rating-scales/use-rating-scales-query"
import { useUpdateEvaluationCriteria } from "../../../api/mutations/evaluation-criteria/update-evaluation-criteria"
import {
  evaluationCriteriaSchema,
  type EvaluationCriteriaValues,
} from "../../../api/schema"
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
    label: "Escala de valoración",
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


const EMPTY: EvaluationCriteriaValues = {
  gradingFormat: "0 - 100",
  gradingScale: "",
  periodCalculationElements: "Actividades + examen",
  subjectGradeCriteria: "Promedio ponderado",
  finalGradeCriteria: "Promedio ponderado por peso",
  areaGradeCriteria: "Promedio de asignaturas",
  studentWithoutGradesPerformance: "No evaluado",
  maxRecoveryGrade: "3.0",
  roundingMode: "Redondear al más cercano",
  initialGrade: "1.0",
}

const FORM_ID = "evaluation-criteria-form"

interface TabEvaluationCriteriaProps {
  academicPeriodId?: number
}

export function TabEvaluationCriteria({
  academicPeriodId,
}: TabEvaluationCriteriaProps) {
  const { notify } = useNotify()
  const { data: criteria, isPending: isLoading } =
    useEvaluationCriteriaQuery(academicPeriodId)

  const { data: options, isPending: isLoadingOptions } =
    useEvaluationCriteriaOptionsQuery()

  const { data: ratingScalesData, isPending: isLoadingRatingScales } =
    useRatingScalesQuery({
      filters: {},
      sorting: [],
      pageIndex: 0,
      pageSize: 100,
      academicPeriodId,
    })

  // La escala de valoración se elige entre los niveles de enseñanza que
  // tengan al menos una escala creada. Si todavía no se creó ninguna, la
  // lista queda vacía y el select se muestra en blanco.
  // Misma forma `{ key, label }` que las opciones del backend, para que el
  // render del select sea uniforme. El valor guardado es el nombre del nivel.
  const gradingScaleOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const scale of ratingScalesData?.rows ?? []) {
      for (const lvl of scale.teachingLevels) {
        map.set(lvl.id, lvl.nombre)
      }
    }
    return Array.from(map.values()).map((nombre) => ({
      key: nombre,
      label: nombre,
    }))
  }, [ratingScalesData])

  const saveCriteria = useUpdateEvaluationCriteria({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
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
      notify("Criterios de evaluación guardados.")
    },
  })

  // Al cargar los criterios del periodo, prellenamos el formulario con ellos.
  useEffect(() => {
    if (criteria) form.reset(criteria)
  }, [criteria, form])

  if (
    (academicPeriodId != null && isLoading) ||
    isLoadingOptions ||
    isLoadingRatingScales
  ) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <NoticeOutlet className="mb-4" />
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
              const fieldOptions =
                cfg.name === "gradingScale"
                  ? gradingScaleOptions
                  : (options?.[cfg.name] ?? [])
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
                        {fieldOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
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
    </>
  )
}
