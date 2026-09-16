import { useMemo } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
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

import { parseGradingRange } from "@/features/establishment/academic-period/components/grading-range"

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


  function gradingFormatLabel(id: string): string | undefined {
    return options?.gradingFormat.find((o) => o.key === id)?.label
  }

  // "Escala de valoración" acá es el NIVEL: elegir "Preescolar" significa
  // "usar el conjunto de valoraciones de Preescolar para todo el periodo",
  // no una banda puntual. Por eso la opción se identifica por `lvl.id`, no
  // por `scale.codigo` — ese codigo es el de UNA banda (`RatingScale` = una
  // valoración, ver `groupRatingScales`), y como esa función fusiona bandas
  // con el mismo nombre/abreviación/tipo entre niveles, ese codigo queda
  // compartido por varios niveles a la vez.
  //
  // El VALOR que viaja al form (`lvl.id`) NO es lo que espera el backend:
  //   - GET (fn_criterio_eval_obtener) devuelve grading_scale = FK_TESCALA
  //     (el PK de la escala contenedora del nivel).
  //   - PUT (fn_criterio_eval_actualizar, ver V95) espera p_grading_scale =
  //     PK_TESCALA_VALORACION (el PK de UNA banda de ese nivel).
  // Son tres espacios de id distintos — `levelIdToBandaId`/`escalaIdToLevelId`
  // traducen entre ellos (ver V123 en postgres/migrations, que agregó
  // FK_TESCALA a fn_escala_listar para poder armar este mapeo).
  const { gradingScaleOptions, levelIdToBandaId, escalaIdToLevelId } = useMemo(() => {
    const levelNames = new Map<number, string>()
    const levelToBanda = new Map<number, number>()
    const escalaToLevel = new Map<number, number>()
    for (const scale of ratingScalesData?.rows ?? []) {
      scale.teachingLevelIds.forEach((levelId, i) => {
        if (!levelNames.has(levelId)) {
          const label = scale.teachingLevels.find((l) => l.id === levelId)?.nombre ?? ""
          levelNames.set(levelId, label)
        }
        if (!levelToBanda.has(levelId)) {
          levelToBanda.set(levelId, scale.bandaIdsByLevel[i])
        }
        const escalaId = scale.escalaIdsByLevel[i]
        if (escalaId != null && !escalaToLevel.has(escalaId)) {
          escalaToLevel.set(escalaId, levelId)
        }
      })
    }
    return {
      gradingScaleOptions: Array.from(levelNames.entries()).map(([id, nombre]) => ({
        key: String(id),
        label: nombre,
      })),
      levelIdToBandaId: levelToBanda,
      escalaIdToLevelId: escalaToLevel,
    }
  }, [ratingScalesData])

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

  // `initialValues.gradingScale` viene del GET como el `FK_TESCALA` (escala
  // contenedora) — se traduce al nivel que le corresponde antes de usarlo
  // como valor del combobox (que está indexado por nivel, no por escala).
  const initialLevelId = initialValues.gradingScale
    ? escalaIdToLevelId.get(Number(initialValues.gradingScale))
    : undefined
  const reconciledGradingScale =
    initialLevelId != null && gradingScaleOptions.some((o) => o.key === String(initialLevelId))
      ? String(initialLevelId)
      : ""

  const form = useForm({
    defaultValues: {
      ...initialValues,
      gradingScale: reconciledGradingScale,
    } as EvaluationCriteriaValues,
    validators: { onSubmit: evaluationCriteriaSchema },
    onSubmit: ({ value }) => {
      if (academicPeriodId != null) {
        // `value.gradingScale` es el nivel elegido en el combobox — el
        // backend espera el PK de una banda de ese nivel
        // (PK_TESCALA_VALORACION, ver comentario de `gradingScaleOptions`),
        // no el id del nivel. Se traduce acá, justo antes de mandar.
        const bandaId = value.gradingScale
          ? levelIdToBandaId.get(Number(value.gradingScale))
          : undefined
        const payload = {
          ...value,
          gradingScale: bandaId != null ? String(bandaId) : "",
        }
        saveCriteria.mutate({ academicPeriodId, values: payload })
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
                          ...(isClearable ? [["", "Cada nivel tendrá su escala"]] : []),
                          ...fieldOptions.map((o) => [o.key, o.label]),
                        ])}
                        value={field.state.value as string}
                        onValueChange={(value) => {
                          if (value == null) return
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
                            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                              {EMPTY_MESSAGES[cfg.name] ?? DEFAULT_EMPTY_MESSAGE}
                            </p>
                          ) : (
                            <ComboboxGroup>
                              {isClearable && (
                                <ComboboxFieldItem value="">Cada nivel tendrá su escala</ComboboxFieldItem>
                              )}
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
