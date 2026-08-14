import { useEffect, useMemo } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useEvaluationCriteriaOptionsQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria-options"
import { useRatingScalesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scales"
import { useUpdateEvaluationCriteria } from "@/features/establishment/academic-period/api/mutations/update-evaluation-criteria"
import {
  evaluationCriteriaSchema,
  type EvaluationCriteriaValues,
} from "@/features/establishment/academic-period/api/schema"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Cada campo declara su tipo de control: `select` para los basados en
// `TLISTA_VALOR` (incluye `gradingScale` que arma sus opciones localmente),
// `number` para los numéricos (`initialGrade`/`maxRecoveryGrade`, rango
// dependiente del formato de calificación seleccionado). El orden es el del
// spec: escala → formato → sin calificaciones → nota inicial → nota máxima de
// recuperación → redondeo → elementos → criterio asignatura → criterio área →
// criterio final.
const FIELDS = [
  {
    name: "gradingScale",
    label: "Escala de valoración",
    kind: "select" as const,
  },
  {
    name: "gradingFormat",
    label: "Formato de calificación",
    kind: "select" as const,
  },
  {
    name: "studentWithoutGradesPerformance",
    label: "Sin calificaciones",
    kind: "select" as const,
  },
  {
    name: "initialGrade",
    label: "Nota inicial para las calificaciones",
    kind: "number" as const,
  },
  {
    name: "maxRecoveryGrade",
    label: "Nota máxima de recuperación",
    kind: "number" as const,
  },
  {
    name: "roundingMode",
    label: "Regla de redondeo",
    kind: "select" as const,
  },
  {
    name: "periodCalculationElements",
    label: "Elementos para calcular la nota de la asignatura",
    kind: "select" as const,
  },
  {
    name: "subjectGradeCriteria",
    label: "Criterio para calcular la nota de la asignatura",
    kind: "select" as const,
  },
  {
    name: "areaGradeCriteria",
    label: "Criterio para calcular la nota del área",
    kind: "select" as const,
  },
  {
    name: "finalGradeCriteria",
    label: "Criterio para calcular la nota final",
    kind: "select" as const,
  },
] as const

// `initialGrade` y `maxRecoveryGrade` se renderizan como `<Input type="number">`
// aparte del loop de selects: su rango depende del formato de calificación
// seleccionado y el spec los pide como numéricos (no como opciones de catálogo).
// El helper `parseGradingRange` (en `grading-range.ts`) resuelve el rango
// OVERALL — matchea tanto el patrón "X - Y" del mock como el FK del back
// contra el catálogo `FORMATO_CALIFICACION` — y devuelve { min, max } que el
// form aplica a los inputs.
import { parseGradingRange } from "@/features/establishment/academic-period/components/grading-range"

// Qué decir cuando un select se queda sin opciones. Sin esto el desplegable
// se abría vacío —una caja en blanco sobre el campo— y no había forma de
// saber si estaba cargando, si falló o si de verdad no hay nada que elegir.
const DEFAULT_EMPTY_MESSAGE = "No hay opciones disponibles."
const EMPTY_MESSAGES: Partial<Record<(typeof FIELDS)[number]["name"], string>> = {
  gradingScale: "Todavía no se creó ninguna escala de valoración para este período.",
}

const EMPTY: EvaluationCriteriaValues = {
  gradingFormat: "",
  gradingScale: "",
  periodCalculationElements: "",
  subjectGradeCriteria: "",
  finalGradeCriteria: "",
  areaGradeCriteria: "",
  studentWithoutGradesPerformance: "",
  maxRecoveryGrade: 0,
  roundingMode: "",
  initialGrade: 0,
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
                    {cfg.kind === "number" ? (
                      <Input
                        id={field.name}
                        type="number"
                        min={0}
                        max={parseGradingRange(form.state.values.gradingFormat).max}
                        step={0.1}
                        placeholder="Agregar"
                        value={Number.isNaN(field.state.value) ? "" : field.state.value}
                        // El atributo `max` es solo una pista visual (HTML5 no
                        // bloquea tipeo ni submit programático). El handler
                        // clampa al máximo activo: si el back ya tiene el
                        // criterio guardado en otro formato y el front abre
                        // con formato más restrictivo, el clamp evita que
                        // quede un valor fuera de rango sin disparar el
                        // 400 del back al guardar.
                        onChange={(e) => {
                          const raw = e.target.valueAsNumber
                          const max = parseGradingRange(
                            form.state.values.gradingFormat
                          ).max
                          if (Number.isFinite(raw) && raw > max) {
                            field.handleChange(max)
                            return
                          }
                          field.handleChange(raw)
                        }}
                        className="h-9"
                        aria-invalid={isInvalid}
                      />
                    ) : (
                      <Select
                        items={Object.fromEntries(fieldOptions.map((o) => [o.key, o.label]))}
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
                    )}
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
                <Button size="sm" type="submit" color="primary" disabled={saveCriteria.isPending}>
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
