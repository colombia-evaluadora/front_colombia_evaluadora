import { useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"
import { ControlPointIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import { useAvailableStudyPlanSubjectsQuery } from "../../api/query/use-available-study-plan-subjects-query"
import { useCreateStudyPlanItem } from "@/features/establishment/academic-period/api/mutations/create-study-plan"
import { useUpdateStudyPlanItem } from "@/features/establishment/academic-period/api/mutations/update-study-plan"
import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useEvaluationCriteriaOptionsQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria-options"
import type { StudyPlanItem } from "@/features/establishment/academic-period/api/types/study-plan"
import {
  studyPlanFormSchema,
  type StudyPlanFormValues,
} from "@/features/establishment/academic-period/api/schema"

const EMPTY: StudyPlanFormValues = {
  asignatura: "",
  intensidadHoraria: 0,
  influenciaArea: 0,
  numeroCreditos: 0,
  influyeDesempeno: true,
  matriculaObligatoria: false,
  aprobacionObligatoria: false,
  formatoCalificacion: "",
  criterioNota: "",
}

const FORM_ID = "study-plan-form"

interface CreateStudyPlanDialogProps {
  academicPeriodId?: number
  gradeId?: number
  item?: StudyPlanItem
}

export function CreateStudyPlanDialog({
  academicPeriodId,
  gradeId,
  item,
}: CreateStudyPlanDialogProps) {
  const isEditing = item != null

  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const tienePersonalizacion =
    item != null && (item.formatoCalificacion != null || item.criterioNota != null)
  const [personalizar, setPersonalizar] = useState(tienePersonalizacion)

  const { data: criteria } = useEvaluationCriteriaQuery(academicPeriodId)
  const { data: criteriaOptions } = useEvaluationCriteriaOptionsQuery()

  const formatoHeredado = criteria?.gradingFormat ?? ""
  const criterioHeredado = criteria?.subjectGradeCriteria ?? ""

  const defaultValues: StudyPlanFormValues = item
    ? {
        asignatura: item.asignatura,
        intensidadHoraria: item.intensidadHoraria,
        influenciaArea: item.influenciaArea,
        numeroCreditos: item.numeroCreditos,
        influyeDesempeno: item.influyeDesempeno,
        matriculaObligatoria: item.matriculaObligatoria ?? false,
        aprobacionObligatoria: item.aprobacionObligatoria ?? false,
        formatoCalificacion: item.formatoCalificacion ?? formatoHeredado,
        criterioNota: item.criterioNota ?? criterioHeredado,
      }
    : EMPTY

  // Solo las asignaturas del grado que aún no están en el plan. Al editar, la
  // asignatura del renglón no viene en "disponibles", así que la agregamos para
  // que el select pueda mostrarla como valor actual.
  const { data: availableSubjects = [] } = useAvailableStudyPlanSubjectsQuery(
    gradeId,
    academicPeriodId
  )
  const asignaturaOptions = (() => {
    const names = availableSubjects.map((s) => s.nombre)
    if (item && !names.includes(item.asignatura)) {
      return [item.asignatura, ...names]
    }
    return names
  })()

  const formatoOptions = criteriaOptions?.gradingFormat ?? []
  const criterioOptions = criteriaOptions?.subjectGradeCriteria ?? []

  const createStudyPlanItem = useCreateStudyPlanItem({
    mutationConfig: {
      onSuccess: () => {
        notify("Asignatura agregada al plan de estudio.")
        form.reset()
        setPersonalizar(false)
        setOpen(false)
      },
    },
  })

  const updateStudyPlanItem = useUpdateStudyPlanItem({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.studyPlan.updated)
        setOpen(false)
      },
    },
  })

  const isSaving = createStudyPlanItem.isPending || updateStudyPlanItem.isPending

  const form = useForm({
    defaultValues,
    validators: { onSubmit: studyPlanFormSchema },
    onSubmit: ({ value }) => {
      const values = studyPlanFormSchema.parse(value)
      const payload: StudyPlanFormValues = personalizar
        ? values
        : { ...values, formatoCalificacion: "", criterioNota: "" }
      if (isEditing) {
        updateStudyPlanItem.mutate({
          codigo: item.codigo,
          gradeId: gradeId as number,
          values: { ...payload, codigo: item.codigo },
        })
      } else {
        createStudyPlanItem.mutate({
          ...payload,
          academicPeriodId,
          gradeId,
        })
      }
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          form.reset()
          setPersonalizar(tienePersonalizacion)
        }
      }}
    >
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="ghost" color="neutral" size="icon-sm" />
          ) : (
            <Button color="primary" size="sm" />
          )
        }
      >
        {isEditing ? (
          <>
            <span className="sr-only">Editar plan de estudio</span>
            <PencilIcon />
          </>
        ) : (
          <>
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </>
        )}
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar plan de estudio" : "Agregar plan de estudio"}
          </DialogTitle>
          <DialogDescription>
            Completa los datos de la asignatura del plan de estudio.
          </DialogDescription>
        </DialogHeader>

        <NoticeOutlet />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <form.Field name="asignatura">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Asignaturas*</FieldLabel>
                    <ComboboxField
                      value={field.state.value}
                      onValueChange={(value) => value && field.handleChange(value)}
                    >
                      <ComboboxFieldTrigger id={field.name} aria-invalid={isInvalid}>
                        <ComboboxFieldValue placeholder="Seleccionar" />
                      </ComboboxFieldTrigger>
                      <ComboboxFieldContent>
                        <ComboboxGroup>
                          {asignaturaOptions.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No hay asignaturas disponibles para este grado.
                            </div>
                          ) : (
                            asignaturaOptions.map((option) => (
                              <ComboboxFieldItem key={option} value={option}>
                                {option}
                              </ComboboxFieldItem>
                            ))
                          )}
                        </ComboboxGroup>
                      </ComboboxFieldContent>
                    </ComboboxField>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>

            <form.Field name="intensidadHoraria">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>Intensidad horaria*</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={1}
                    max={99}
                    step={1}
                    placeholder="Agregar"
                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                    onBlur={field.handleBlur}
                    onKeyDown={(e) => {
                      if (["-", "+", ".", ",", "e", "E"].includes(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber
                      if (e.target.value === "" || !Number.isNaN(value)) {
                        field.handleChange(value)
                      }
                    }}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="influenciaArea">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>Influencia área*</FieldLabel>
                  <InputGroup className="h-11 rounded-md border border-input px-3 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
                    <InputGroupInput
                      id={field.name}
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Agregar"
                      className="px-0"
                      value={Number.isNaN(field.state.value) ? "" : field.state.value}
                      onBlur={field.handleBlur}
                      // INFLUENCIA_AREA admite decimales (NUMERIC(5,2)), solo
                      // se bloquea signo/notación científica.
                      onKeyDown={(e) => {
                        if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault()
                      }}
                      onChange={(e) => {
                        const value = e.target.valueAsNumber
                        if (e.target.value === "" || !Number.isNaN(value)) {
                          field.handleChange(value)
                        }
                      }}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              )}
            </form.Field>

            <form.Field name="numeroCreditos">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>Número de créditos *</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Agregar"
                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                    onBlur={field.handleBlur}
                    // NUMERO_CREDITO es entero, sin decimales ni negativos.
                    onKeyDown={(e) => {
                      if (["-", "+", ".", ",", "e", "E"].includes(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber
                      if (e.target.value === "" || !Number.isNaN(value)) {
                        field.handleChange(value)
                      }
                    }}
                  />
                </Field>
              )}
            </form.Field>
          </div>

          <label className="flex w-fit items-center gap-3 text-sm font-medium">
            Personalizar
            <Switch
              checked={personalizar}
              onCheckedChange={setPersonalizar}
              className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
            />
          </label>

          <div
            className={cn(
              "grid gap-4 sm:grid-cols-3",
              !personalizar && "pointer-events-none opacity-50",
            )}
          >
            <form.Field name="influyeDesempeno">
              {(field) => (
                <Field>
                  <FieldLabel>Influye en el desempeño académico (S/N)</FieldLabel>
                  <RadioGroup
                    className="flex gap-6 pt-2"
                    disabled={!personalizar}
                    value={field.state.value ? "si" : "no"}
                    onValueChange={(value) => field.handleChange(value === "si")}
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

            <form.Field name="matriculaObligatoria">
              {(field) => (
                <Field>
                  <FieldLabel>Matrícula obligatoria (S/N)</FieldLabel>
                  <RadioGroup
                    className="flex gap-6 pt-2"
                    disabled={!personalizar}
                    value={field.state.value ? "si" : "no"}
                    onValueChange={(value) => field.handleChange(value === "si")}
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

            <form.Field name="aprobacionObligatoria">
              {(field) => (
                <Field>
                  <FieldLabel>Aprobación obligatoria (S/N)</FieldLabel>
                  <RadioGroup
                    className="flex gap-6 pt-2"
                    disabled={!personalizar}
                    value={field.state.value ? "si" : "no"}
                    onValueChange={(value) => field.handleChange(value === "si")}
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

            <form.Field name="formatoCalificacion">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>Formato de calificación</FieldLabel>
                  <ComboboxField
                    value={personalizar ? field.state.value : formatoHeredado}
                    disabled={!personalizar}
                    onValueChange={(value) => value && field.handleChange(value)}
                  >
                    <ComboboxFieldTrigger id={field.name}>
                      <ComboboxFieldValue>
                        {(value) =>
                          formatoOptions.find((o) => o.key === value)?.label ?? "Seleccionar"
                        }
                      </ComboboxFieldValue>
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                      <ComboboxGroup>
                        {formatoOptions.map((option) => (
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

            <form.Field name="criterioNota">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>
                    Criterio para calcular la nota de la asignatura
                  </FieldLabel>
                  <ComboboxField
                    value={personalizar ? field.state.value : criterioHeredado}
                    disabled={!personalizar}
                    onValueChange={(value) => value && field.handleChange(value)}
                  >
                    <ComboboxFieldTrigger id={field.name}>
                      <ComboboxFieldValue>
                        {(value) =>
                          criterioOptions.find((o) => o.key === value)?.label ?? "Seleccionar"
                        }
                      </ComboboxFieldValue>
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                      <ComboboxGroup>
                        {criterioOptions.map((option) => (
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
          </div>
        </form>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            {isEditing ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
