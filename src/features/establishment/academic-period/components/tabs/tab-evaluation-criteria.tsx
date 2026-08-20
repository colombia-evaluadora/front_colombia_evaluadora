import { useMemo } from "react"
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
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

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

  return (
    <EvaluationCriteriaForm
      // Fuerza a remontar el form (y por lo tanto sus `defaultValues`) si
      // se navega a otro periodo mientras el componente sigue montado.
      key={academicPeriodId ?? "new"}
      academicPeriodId={academicPeriodId}
      initialValues={criteria ?? EMPTY}
      options={options}
      ratingScalesData={ratingScalesData}
    />
  )
}

interface EvaluationCriteriaFormProps {
  academicPeriodId?: number
  initialValues: EvaluationCriteriaValues
  options: ReturnType<typeof useEvaluationCriteriaOptionsQuery>["data"]
  ratingScalesData: ReturnType<typeof useRatingScalesQuery>["data"]
}

function EvaluationCriteriaForm({
  academicPeriodId,
  initialValues,
  options,
  ratingScalesData,
}: EvaluationCriteriaFormProps) {
  const { notify } = useNotify()

  // `form.state.values.gradingFormat` es el FK (id) seleccionado en el
  // select — `parseGradingRange` necesita el nombre ("De cero a cinco") para
  // resolver el rango, no el id (que nunca matchea `FORMAT_MAX_BY_NAME` y
  // caía siempre al default 0-100 sin importar el formato elegido).
  function gradingFormatLabel(id: string): string | undefined {
    return options?.gradingFormat.find((o) => o.key === id)?.label
  }

  // La escala de valoración se elige entre los niveles de enseñanza que
  // tengan al menos una escala creada. Si todavía no se creó ninguna, la
  // lista queda vacía y el select se muestra en blanco.
  // Misma forma `{ key, label }` que las opciones del backend, para que el
  // render del select sea uniforme. `GRADING_SCALE` es BIGINT en el back y
  // referencia la escala en sí (`RatingScale.codigo`, la PK que ya usan
  // update-rating-scale.ts/delete-rating-scale.ts) — NO el id del nivel de
  // enseñanza. Mandar `lvl.id` ahí es lo que disparaba "la escala de
  // valoración 1 no existe o está inactiva" (1 era el id de Preescolar, no
  // el de ninguna escala). Se dedupea por nivel (un nivel puede tener más
  // de una escala — bandas repetidas por tipo/nombre — pero acá solo hace
  // falta una referencia válida por nivel), quedándose con la primera.
  const gradingScaleOptions = useMemo(() => {
    const map = new Map<number, { codigo: number; nombre: string }>()
    for (const scale of ratingScalesData?.rows ?? []) {
      for (const lvl of scale.teachingLevels) {
        if (!map.has(lvl.id)) map.set(lvl.id, { codigo: scale.codigo, nombre: lvl.nombre })
      }
    }
    return Array.from(map.values()).map(({ codigo, nombre }) => ({
      key: String(codigo),
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

  // `defaultValues` toma los criterios ya cargados directo (en vez de
  // arrancar en `EMPTY` y hacer `form.reset()` en un efecto post-montaje):
  // ese `reset()` actualizaba el estado interno del form correctamente
  // —confirmado viendo los criterios correctos en el log— pero los
  // `<ComboboxField>` no reflejaban el cambio la primera vez que se montaba el
  // componente (sí en montajes posteriores, con los datos ya en caché).
  // Montar el form directo con los valores correctos evita depender de ese
  // reset después del primer render.
  // Si la escala guardada en el criterio ya no existe (se borró después de
  // guardarla), `gradingScale` sigue trayendo su id viejo — reenviarlo tal
  // cual revienta el guardado con "La escala de valoracion % no existe o
  // esta inactiva" sin que el usuario haya tocado el campo. Se reconcilia acá
  // contra las opciones vigentes: si el id guardado no aparece, el select
  // arranca en "Ninguna" en vez de mandar una referencia muerta.
  const reconciledGradingScale =
    initialValues.gradingScale &&
    !gradingScaleOptions.some((option) => option.key === initialValues.gradingScale)
      ? ""
      : initialValues.gradingScale

  const form = useForm({
    defaultValues: {
      ...initialValues,
      gradingScale: reconciledGradingScale,
    } as EvaluationCriteriaValues,
    validators: { onSubmit: evaluationCriteriaSchema },
    onSubmit: ({ value }) => {
      if (academicPeriodId != null) {
        saveCriteria.mutate({ academicPeriodId, values: value })
        return
      }
      notify(SUCCESS_MESSAGES.evaluationCriteria.updated)
    },
  })

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
                // No todos los establecimientos tienen una escala de
                // valoración creada todavía (ver comentario en
                // use-evaluation-criteria.ts) — a diferencia de los demás
                // campos, este puede quedar sin seleccionar, así que
                // necesita una forma explícita de volver a "ninguna".
                const isClearable = cfg.name === "gradingScale"
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
                        max={parseGradingRange(gradingFormatLabel(form.state.values.gradingFormat)).max}
                        step={0.1}
                        placeholder="Agregar"
                        value={Number.isNaN(field.state.value) ? "" : field.state.value}
                        onKeyDown={(e) => {
                          if (["-", "+", "e", "E"].includes(e.key)) {
                            e.preventDefault()
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.valueAsNumber
                          if (e.target.value !== "" && Number.isNaN(raw)) return
                          const max = parseGradingRange(
                            gradingFormatLabel(form.state.values.gradingFormat)
                          ).max
                          if (Number.isFinite(raw) && raw > max) {
                            field.handleChange(max)
                            return
                          }
                          field.handleChange(raw)
                        }}
                        className="h-10"
                        aria-invalid={isInvalid}
                      />
                    ) : (
                      <ComboboxField
                        items={Object.fromEntries([
                          ...(isClearable ? [["", "Ninguna"]] : []),
                          ...fieldOptions.map((o) => [o.key, o.label]),
                        ])}
                        // `field.state.value` se infiere como la unión de
                        // todos los campos de `FIELDS` (incluye los `number`
                        // de arriba) porque `cfg.name` no es un literal acá
                        // — en este branch (`cfg.kind !== "number"`) siempre
                        // es el `string` de un campo de catálogo.
                        value={field.state.value as string}
                        onValueChange={(value) => {
                          if (value == null) return
                          // Nota inicial y nota máxima de recuperación viven
                          // en la escala del formato (igual que las bandas de
                          // escala de valoración) — al cambiar el formato acá
                          // mismo, sin esperar a guardar, se reescalan en
                          // proporción al nuevo rango para que el usuario no
                          // vea un "5" que ya no tiene sentido en un formato
                          // 0-100 recién elegido.
                          if (cfg.name === "gradingFormat") {
                            const oldMax = parseGradingRange(gradingFormatLabel(field.state.value as string)).max
                            const newMax = parseGradingRange(gradingFormatLabel(value)).max
                            if (oldMax !== newMax) {
                              const rescale = (n: number) =>
                                Number.isFinite(n) ? Math.round((n / oldMax) * newMax * 10) / 10 : n
                              form.setFieldValue("initialGrade", rescale(form.state.values.initialGrade))
                              form.setFieldValue(
                                "maxRecoveryGrade",
                                rescale(form.state.values.maxRecoveryGrade),
                              )
                            }
                          }
                          field.handleChange(value)
                        }}
                      >
                        <ComboboxFieldTrigger id={field.name} aria-invalid={isInvalid}>
                          <ComboboxFieldValue placeholder="Seleccionar" />
                        </ComboboxFieldTrigger>
                        <ComboboxFieldContent>
                          {fieldOptions.length === 0 ? (
                            // Sin opciones no tiene sentido ofrecer "Ninguna"
                            // (no hay nada que limpiar) — solo el mensaje de
                            // por qué está vacío.
                            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                              {EMPTY_MESSAGES[cfg.name] ?? DEFAULT_EMPTY_MESSAGE}
                            </p>
                          ) : (
                            <ComboboxGroup>
                              {isClearable && <ComboboxFieldItem value="">Ninguna</ComboboxFieldItem>}
                              {fieldOptions.map((option) => (
                                <ComboboxFieldItem
                                  key={option.key}
                                  value={option.key}
                                  title={option.label}
                                >
                                  {option.label}
                                </ComboboxFieldItem>
                              ))}
                            </ComboboxGroup>
                          )}
                        </ComboboxFieldContent>
                      </ComboboxField>
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
