import { useRef, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useSelector } from "@tanstack/react-form"
import { useAppForm } from "@/lib/forms"
import {
  ControlPointIcon,
  FloppyDiskIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  QuestionIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { getErrorMessage } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
  ComboboxSeparator,
} from "@/components/ui/combobox"
import { toFieldErrors } from "@/lib/forms"
import { useAvailableStudyPlanSubjectsQuery } from "../../api/query/use-available-study-plan-subjects-query"
import { useSubjectDetailsQuery } from "@/features/establishment/academic-period/api/query/use-subject-details-query"
import { usePromotionCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-promotion-criteria"
import { QuickCreateSubjectDialog } from "./dialog-quick-create-subject"
import { useCreateStudyPlanItem } from "@/features/establishment/academic-period/api/mutations/create-study-plan"
import { useUpdateStudyPlanItem } from "@/features/establishment/academic-period/api/mutations/update-study-plan"
import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useEvaluationCriteriaOptionsQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import type { StudyPlanItem } from "@/features/establishment/academic-period/api/types/study-plan"
import {
  studyPlanFormSchema,
  type StudyPlanFormValues,
} from "@/features/establishment/academic-period/api/schema"
import { DecimalField } from "@/features/establishment/academic-period/components/fields/decimal-field"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"

const FORM_ID = "study-plan-form"
const CREATE_SUBJECT_VALUE = "__create_subject__"

interface CreateStudyPlanDialogProps {
  academicPeriodId?: number
  gradeId?: number
  item?: StudyPlanItem
  isPreescolar?: boolean
  isFormativo?: boolean
  subjectLabel?: string
}

// "Agregar asignatura" / "Modificar plan de estudio" (Sección 5.3).
export function CreateStudyPlanDialog({
  academicPeriodId,
  gradeId,
  item,
  isPreescolar,
  isFormativo,
  subjectLabel = "Asignatura",
}: CreateStudyPlanDialogProps) {
  const isEditing = item != null
  const subjectWord = subjectLabel.toLowerCase()
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false)

  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)
  const noticeIdRef = useRef(0)
  function notifyInDialog(message: string) {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant: "error" })
  }

  const { data: criteria } = useEvaluationCriteriaQuery(academicPeriodId)
  const { data: criteriaOptions } = useEvaluationCriteriaOptionsQuery()
  const formatoHeredado = criteria?.gradingFormat ?? ""
  const criterioHeredado = criteria?.subjectGradeCriteria ?? ""
  const areaCriteriaLabel =
    criteriaOptions?.areaGradeCriteria.find((o) => o.key === criteria?.areaGradeCriteria)?.label ?? ""
  // El Porcentaje es obligatorio con "Cada asignatura tiene un porcentaje" (Regla 76).
  const porcentajeRequerido = areaCriteriaLabel.toLowerCase().includes("porcentaje")

  const tienePersonalizacion = item?.formatoCalificacion != null || item?.criterioNota != null
  const [personalizar, setPersonalizar] = useState(tienePersonalizacion)

  const defaultValues: StudyPlanFormValues = item
    ? {
        asignaturaId: item.asignaturaId,
        intensidadHoraria: item.intensidadHoraria,
        influenciaArea: item.influenciaArea,
        numeroCreditos: item.numeroCreditos,
        influyeDesempeno: item.influyeDesempeno,
        matriculaObligatoria: item.matriculaObligatoria ?? false,
        aprobacionObligatoria: item.aprobacionObligatoria ?? false,
        formatoCalificacion: item.formatoCalificacion ?? formatoHeredado,
        criterioNota: item.criterioNota ?? criterioHeredado,
      }
    : {
        // Los tres Sí/No arrancan en Sí (Reglas 64 a 66).
        asignaturaId: 0,
        intensidadHoraria: Number.NaN,
        influenciaArea: porcentajeRequerido ? Number.NaN : 100,
        numeroCreditos: 0,
        influyeDesempeno: true,
        matriculaObligatoria: true,
        aprobacionObligatoria: true,
        formatoCalificacion: formatoHeredado,
        criterioNota: criterioHeredado,
      }

  const { data: availableSubjects = [] } = useAvailableStudyPlanSubjectsQuery(gradeId, academicPeriodId)
  const asignaturaOptions =
    item && !availableSubjects.some((s) => s.id === item.asignaturaId)
      ? [{ id: item.asignaturaId, label: item.asignatura }, ...availableSubjects]
      : availableSubjects
  const { data: subjectDetails = [] } = useSubjectDetailsQuery(academicPeriodId)

  // Regla 106: si la asignatura (o su área, con Nodo Área) es obligatoria para
  // la aprobación, Aprobación obligatoria queda en Sí y bloqueada.
  const { data: periodPromotion } = usePromotionCriteriaQuery(academicPeriodId)
  const { data: gradePromotion } = usePromotionCriteriaQuery(academicPeriodId, gradeId)
  const promotion = gradePromotion ?? periodPromotion

  const createStudyPlanItem = useCreateStudyPlanItem({
    mutationConfig: {
      onSuccess: () => {
        notify(`${subjectLabel} agregada al plan de estudio.`)
        close()
      },
      onError: (error) => notifyInDialog(getErrorMessage(error)),
    },
  })
  const updateStudyPlanItem = useUpdateStudyPlanItem({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notifyInDialog(result.message)
          return
        }
        notify(SUCCESS_MESSAGES.studyPlan.updated)
        close()
      },
      onError: (error) => notifyInDialog(getErrorMessage(error)),
    },
  })
  const isSaving = createStudyPlanItem.isPending || updateStudyPlanItem.isPending

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: studyPlanFormSchema },
    onSubmit: ({ value }) => {
      // Con Personalizar en No usa el Formato y el Criterio del período (Regla 61).
      const payload: StudyPlanFormValues = personalizar
        ? value
        : { ...value, formatoCalificacion: "", criterioNota: "" }
      if (isEditing) {
        updateStudyPlanItem.mutate({
          codigo: item.codigo,
          gradeId: gradeId as number,
          values: { ...payload, codigo: item.codigo },
        })
      } else {
        createStudyPlanItem.mutate({ ...payload, academicPeriodId, gradeId })
      }
    },
  })

  const values = useSelector(form.store, (s) => ({
    asignaturaId: s.values.asignaturaId,
    aprobacionObligatoria: s.values.aprobacionObligatoria,
  }))
  const selected = subjectDetails.find((s) => s.id === values.asignaturaId)
  const isMandatoryForApproval =
    promotion != null &&
    selected != null &&
    (promotion.curriculumNode === "AR"
      ? promotion.requiredSubjects.includes(selected.areaId)
      : promotion.requiredSubjects.includes(selected.id))

  function close() {
    setOpen(false)
    setNotice(null)
    form.reset(defaultValues)
    setPersonalizar(tienePersonalizacion)
  }

  const { confirmDiscardOpen, requestClose, onOpenChange, discardDialogProps } = useGuardedDialog({
    isSaving,
    isDirty: () => !formValuesEqual(form.state.values, defaultValues) || personalizar !== tienePersonalizacion,
    onOpen: () => {
      form.reset(defaultValues)
      setOpen(true)
      setNotice(null)
    },
    onClose: close,
  })

  const formatoOptions = (criteriaOptions?.gradingFormat ?? []).map((o) => ({ value: o.key, label: o.label }))
  const criterioOptions = (criteriaOptions?.subjectGradeCriteria ?? []).map((o) => ({ value: o.key, label: o.label }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {isEditing ? (
        <Tooltip>
          <TooltipTrigger
            render={<DialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />}
          >
            <span className="sr-only">Modificar {item.asignatura}</span>
            <PencilIcon />
          </TooltipTrigger>
          <TooltipContent>Modificar</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger render={<Button color="primary" size="sm" />}>
          <ControlPointIcon data-icon="inline-start" />
          Agregar {subjectWord}
        </DialogTrigger>
      )}
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl"
        inert={confirmDiscardOpen || createSubjectOpen}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{isEditing ? "Modificar plan de estudio" : `Agregar ${subjectWord}`}</DialogTitle>
        </DialogHeader>

        <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-1">
          <NoticeBanner
            notice={notice}
            onClose={() => setNotice(null)}
            variant={notice?.variant}
            autoCloseMs={12000}
          />
          {!isFormativo && (
            <p className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
              Con Personalizar en No, la {subjectWord} usa el Formato y el Criterio del período (Criterios de
              evaluación).
            </p>
          )}

          <form
            id={FORM_ID}
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="flex flex-col gap-5"
          >
            <form.Field
              name="asignaturaId"
              listeners={{
                onChange: ({ value }) => {
                  const subject = subjectDetails.find((s) => s.id === value)
                  const forced =
                    promotion != null &&
                    subject != null &&
                    (promotion.curriculumNode === "AR"
                      ? promotion.requiredSubjects.includes(subject.areaId)
                      : promotion.requiredSubjects.includes(subject.id))
                  if (forced) form.setFieldValue("aprobacionObligatoria", true)
                },
              }}
            >
              {(field) => {
                const invalid = form.state.submissionAttempts > 0 && !field.state.meta.isValid
                return (
                  <Field variant="outlined" data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>
                      {subjectLabel}
                      <span className="text-red"> *</span>
                    </FieldLabel>
                    <ComboboxField
                      items={Object.fromEntries(asignaturaOptions.map((o) => [String(o.id), o.label]))}
                      value={field.state.value ? String(field.state.value) : ""}
                      onValueChange={(value) => {
                        if (value === CREATE_SUBJECT_VALUE) {
                          setCreateSubjectOpen(true)
                          return
                        }
                        if (value) field.handleChange(Number(value))
                      }}
                    >
                      <ComboboxFieldTrigger id={field.name} aria-invalid={invalid || undefined}>
                        <ComboboxFieldValue placeholder="Seleccione..." />
                      </ComboboxFieldTrigger>
                      <ComboboxFieldContent>
                        <ComboboxGroup>
                          {asignaturaOptions.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              Todas las {subjectWord}s del período ya están en el plan.
                            </div>
                          ) : (
                            asignaturaOptions.map((option) => (
                              <ComboboxFieldItem key={option.id} value={String(option.id)} title={option.label}>
                                {option.label}
                              </ComboboxFieldItem>
                            ))
                          )}
                        </ComboboxGroup>
                        <ComboboxSeparator />
                        <ComboboxGroup>
                          <ComboboxFieldItem value={CREATE_SUBJECT_VALUE} className="text-primary">
                            <span className="inline-flex items-center gap-1.5">
                              <PlusIcon />
                              Crear {subjectWord}
                            </span>
                          </ComboboxFieldItem>
                        </ComboboxGroup>
                      </ComboboxFieldContent>
                    </ComboboxField>
                    {invalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
                  </Field>
                )
              }}
            </form.Field>

            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              {/* Preescolar y formativos no se califican: no hay rendimiento que influir. */}
              {!isPreescolar && !isFormativo && (
                <form.Field name="influyeDesempeno">
                  {(field) => (
                    <YesNo
                      label="Influye en el rendimiento académico"
                      value={field.state.value}
                      onChange={(v) => field.handleChange(v)}
                      disabled={!values.aprobacionObligatoria}
                      description={
                        values.aprobacionObligatoria ? undefined : "Con Aprobación obligatoria en No, queda en No."
                      }
                    />
                  )}
                </form.Field>
              )}
              <form.Field name="matriculaObligatoria">
                {(field) => (
                  <YesNo
                    label="Matrícula obligatoria"
                    value={field.state.value}
                    onChange={(v) => field.handleChange(v)}
                  />
                )}
              </form.Field>
              {!isFormativo && (
                <form.Field
                  name="aprobacionObligatoria"
                  listeners={{
                    // Regla 66: sin aprobación obligatoria no influye en el rendimiento.
                    onChange: ({ value }) => {
                      if (!value) form.setFieldValue("influyeDesempeno", false)
                    },
                  }}
                >
                  {(field) => (
                    <YesNo
                      label="Aprobación obligatoria"
                      value={field.state.value}
                      onChange={(v) => field.handleChange(v)}
                      disabled={isMandatoryForApproval}
                      description={
                        isMandatoryForApproval
                          ? "Está en las obligatorias para la aprobación de los Criterios de promoción."
                          : undefined
                      }
                    />
                  )}
                </form.Field>
              )}
            </div>

            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <form.AppField name="intensidadHoraria">
                {(field) => (
                  <field.NumberField
                    label="Intensidad horaria"
                    required
                    valueAs="number"
                    maxDigits={2}
                    suffix="bloques/semana"
                    placeholder=""
                    description="Cada hora es un bloque de la jornada."
                  />
                )}
              </form.AppField>
              {/* Solo con "Cada [Área] tiene un porcentaje"; si no, se guarda 100 y no se usa (Regla 76). */}
              {porcentajeRequerido && (
                <form.Field name="influenciaArea">
                  {(field) => (
                    <DecimalField
                      field={field}
                      label="Porcentaje"
                      suffix="%"
                      required
                      description="Peso de la asignatura dentro de su área."
                    />
                  )}
                </form.Field>
              )}
            </div>

            {!isFormativo && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1 text-sm">
                    <label htmlFor="study-plan-personalizar">Personalizar</label>
                    <Tooltip>
                      <TooltipTrigger
                        render={<button type="button" className="text-muted-foreground" aria-label="Ayuda: Personalizar" />}
                      >
                        <QuestionIcon className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Con Sí, la {subjectWord} usa su propio Formato de calificación y Criterio solo en este grado.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <label className="flex w-fit cursor-pointer items-center gap-2">
                    <Switch
                      id="study-plan-personalizar"
                      checked={personalizar}
                      onCheckedChange={(checked) => {
                        setPersonalizar(checked)
                        if (!checked) {
                          form.setFieldValue("formatoCalificacion", formatoHeredado)
                          form.setFieldValue("criterioNota", criterioHeredado)
                        }
                      }}
                      className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                    />
                    <span className="text-sm">{personalizar ? "Sí" : "No"}</span>
                  </label>
                </div>
                <form.AppField name="formatoCalificacion">
                  {(field) => (
                    <field.SelectField
                      label="Formato de calificación"
                      required
                      disabled={!personalizar}
                      options={formatoOptions}
                    />
                  )}
                </form.AppField>
                <form.AppField name="criterioNota">
                  {(field) => (
                    <field.SelectField
                      label={`Criterio para calcular la nota de la ${subjectWord}`}
                      required
                      disabled={!personalizar}
                      options={criterioOptions}
                    />
                  )}
                </form.AppField>
              </>
            )}
          </form>
        </div>

        <DialogFooter className="shrink-0 px-6 pb-6">
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={isSaving} aria-busy={isSaving}>
            {isSaving ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : isEditing ? (
              <FloppyDiskIcon data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            {isEditing ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <QuickCreateSubjectDialog
        academicPeriodId={academicPeriodId}
        open={createSubjectOpen}
        onOpenChange={setCreateSubjectOpen}
        onSaved={(created) => form.setFieldValue("asignaturaId", created.id)}
        isPreescolar={isPreescolar}
        subjectLabel={subjectLabel}
      />
      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}

function YesNo({
  label,
  value,
  onChange,
  disabled,
  description,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  description?: string
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm">
        {label}
        <span className="text-red"> *</span>
      </legend>
      <RadioGroup
        className="flex items-center gap-6"
        value={value ? "si" : "no"}
        disabled={disabled}
        onValueChange={(v) => onChange(v === "si")}
      >
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="si" />
          Sí
        </label>
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="no" />
          No
        </label>
      </RadioGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
    </fieldset>
  )
}
