import { useEffect, useMemo } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"

import { useEvaluationCriteriaQuery } from "../../../api/query/evaluation-criteria/use-evaluation-criteria-query"
import { useEvaluationCriteriaOptionsQuery } from "../../../api/query/evaluation-criteria/use-evaluation-criteria-options-query"
import { useRatingScalesQuery } from "../../../api/query/rating-scales/use-rating-scales-query"
import { useUpdateEvaluationCriteria } from "../../../api/mutations/evaluation-criteria/update-evaluation-criteria"
import { evaluationCriteriaSchema, type EvaluationCriteriaValues } from "../../../api/schema"
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
    label: "Formato de calificación",
  },
  {
    name: "studentWithoutGradesPerformance",
    label: "Sin calificaciones",
  },
  {
    name: "initialGrade",
    label: "Nota inicial para las calificaciones",
  },
  {
    name: "maxRecoveryGrade",
    label: "Nota máxima de recuperación",
  },
  {
    name: "roundingMode",
    label: "Regla de redondeo",
  },
  {
    name: "periodCalculationElements",
    label: "Elementos para calcular la nota de la asignatura",
  },
  {
    name: "subjectGradeCriteria",
    label: "Criterio para calcular la nota de la asignatura",
  },
  {
    name: "areaGradeCriteria",
    label: "Criterio para calcular la nota del área",
  },
  {
    name: "finalGradeCriteria",
    label: "Criterio para calcular la nota final",
  },
] as const

// Qué decir cuando un select se queda sin opciones. Sin esto el desplegable
// se abría vacío —una caja en blanco sobre el campo— y no había forma de
// saber si estaba cargando, si falló o si de verdad no hay nada que elegir.
const DEFAULT_EMPTY_MESSAGE = "No hay opciones disponibles."
const EMPTY_MESSAGES: Partial<Record<(typeof FIELDS)[number]["name"], string>> = {
  gradingScale: "Todavía no se creó ninguna escala de valoración para este período.",
}

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

export function TabEvaluationCriteria({ academicPeriodId }: TabEvaluationCriteriaProps) {
  const { notify } = useNotify()
  const { data: criteria, isPending: isLoading } = useEvaluationCriteriaQuery(academicPeriodId)

  const { data: options, isPending: isLoadingOptions } = useEvaluationCriteriaOptionsQuery()

  const { data: ratingScalesData, isPending: isLoadingRatingScales } = useRatingScalesQuery({
    filters: {},
    sorting: [],
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
        notify(SUCCESS_MESSAGES.evaluationCriteria.updated)
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
      notify(SUCCESS_MESSAGES.evaluationCriteria.updated)
    },
  })

  // Al cargar los criterios del periodo, prellenamos el formulario con ellos.
  useEffect(() => {
    if (criteria) form.reset(criteria)
  }, [criteria, form])

  if ((academicPeriodId != null && isLoading) || isLoadingOptions || isLoadingRatingScales) {
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
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                const fieldOptions =
                  cfg.name === "gradingScale" ? gradingScaleOptions : (options?.[cfg.name] ?? [])
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name} className="flex-1">
                      {cfg.label}
                    </FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => value && field.handleChange(value)}
                    >
                      <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.length === 0 ? (
                          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                            {EMPTY_MESSAGES[cfg.name] ?? DEFAULT_EMPTY_MESSAGE}
                          </p>
                        ) : (
                          <SelectGroup>
                            {fieldOptions.map((option) => (
                              <SelectItem key={option.key} value={option.key}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
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
          <form.Subscribe selector={(state) => state.isDirty}>
            {(isDirty) =>
              isDirty ? (
                <Button type="submit" color="primary" disabled={saveCriteria.isPending}>
                  {saveCriteria.isPending ? "Guardando..." : "Guardar"}
                </Button>
              ) : null
            }
          </form.Subscribe>
        </div>
      </form>
    </>
  )
}
