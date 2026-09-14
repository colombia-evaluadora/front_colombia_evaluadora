import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm, useSelector } from "@tanstack/react-form"
import {
  CaretDownIcon,
  ControlPointIcon,
  PencilIcon,
  PlusIcon,
  SpinnerIcon,
} from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
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
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Combobox,
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import {
  availableStudyPlanSubjectsQueryKey,
  useAvailableStudyPlanSubjectsQuery,
} from "../../api/query/use-available-study-plan-subjects-query"
import { useSubjectDetailsQuery } from "@/features/establishment/academic-period/api/query/use-subject-details-query"
import { QuickCreateSubjectDialog } from "./dialog-quick-create-subject"
import {
  SubjectInlineEditFields,
  type SubjectInlineEditFieldsHandle,
} from "@/features/establishment/academic-period/components/subject-inline-edit-fields"
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
  asignaturaId: 0,
  intensidadHoraria: 0,
  influenciaArea: 0,
  numeroCreditos: 0,
  influyeDesempeno: true,
  matriculaObligatoria: true,
  aprobacionObligatoria: true,
  formatoCalificacion: "",
  criterioNota: "",
}

const FORM_ID = "study-plan-form"
const CREATE_SUBJECT_VALUE = "__create_subject__"

interface CreateStudyPlanDialogProps {
  academicPeriodId?: number
  gradeId?: number
  item?: StudyPlanItem
  // Solución temporal de front: en preescolar se rotula como "dimensión" en
  // vez de "asignatura" — mismo modelo de datos, solo cambia el texto.
  isPreescolar?: boolean
}

export function CreateStudyPlanDialog({
  academicPeriodId,
  gradeId,
  item,
  isPreescolar,
}: CreateStudyPlanDialogProps) {
  const isEditing = item != null
  const subjectWord = isPreescolar ? "dimensión" : "asignatura"

  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerAnchorRef = useRef<HTMLDivElement>(null)
  const [subjectName, setSubjectName] = useState(item?.asignatura ?? "")

  const [notice, setNotice] = useState<{
    id: number
    message: string
    variant: NoticeVariant
  } | null>(null)
  const noticeIdRef = useRef(0)

  function notifyInDialog(message: string, options?: { variant?: NoticeVariant }) {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant: options?.variant ?? "error" })
  }

  const tienePersonalizacion =
    item != null && (item.formatoCalificacion != null || item.criterioNota != null)
  const [personalizar, setPersonalizar] = useState(tienePersonalizacion)

  const { data: criteria } = useEvaluationCriteriaQuery(academicPeriodId)
  const { data: criteriaOptions } = useEvaluationCriteriaOptionsQuery()

  const formatoHeredado = criteria?.gradingFormat ?? ""
  const criterioHeredado = criteria?.subjectGradeCriteria ?? ""

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
    : EMPTY

  const { data: availableSubjects = [] } = useAvailableStudyPlanSubjectsQuery(
    gradeId,
    academicPeriodId,
  )
  const asignaturaOptions = (() => {
    if (item && !availableSubjects.some((s) => s.id === item.asignaturaId)) {
      return [{ id: item.asignaturaId, label: item.asignatura }, ...availableSubjects]
    }
    return availableSubjects
  })()

  const { data: subjectDetails = [] } = useSubjectDetailsQuery(academicPeriodId)

  const formatoOptions = criteriaOptions?.gradingFormat ?? []
  const criterioOptions = criteriaOptions?.subjectGradeCriteria ?? []

  const createStudyPlanItem = useCreateStudyPlanItem({
    mutationConfig: {
      onSuccess: () => {
        notify("Asignatura agregada al plan de estudio.")
        form.reset()
        setPersonalizar(false)
        setSubjectName("")
        setOpen(false)
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error))
      },
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
        setOpen(false)
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error))
      },
    },
  })

  const isSaving = createStudyPlanItem.isPending || updateStudyPlanItem.isPending
  const subjectFieldsRef = useRef<SubjectInlineEditFieldsHandle>(null)

  const form = useForm({
    defaultValues,
    validators: { onSubmit: studyPlanFormSchema },
    onSubmit: async ({ value }) => {
      const subjectSaved = await subjectFieldsRef.current?.save()
      if (subjectSaved === false) return

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

  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)

  async function handleSubjectCreated(created: { id: number; nombreInterno: string }) {
    await queryClient.invalidateQueries({
      queryKey: availableStudyPlanSubjectsQueryKey(gradeId, academicPeriodId),
    })
    queryClient.invalidateQueries({ queryKey: ["subject-details", academicPeriodId] })
    form.setFieldValue("asignaturaId", created.id)
    setSubjectName(created.nombreInterno)
  }

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  function closeDialog() {
    setOpen(false)
    setNotice(null)
    form.reset()
    setPersonalizar(tienePersonalizacion)
    setSubjectName(item?.asignatura ?? "")
  }

  function requestClose() {
    if (isSaving) return
    const isDirty =
      JSON.stringify(form.state.values) !== JSON.stringify(defaultValues) ||
      personalizar !== tienePersonalizacion
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    closeDialog()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true)
          setNotice(null)
        } else {
          requestClose()
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
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        inert={confirmDiscardOpen}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar plan de estudio" : "Agregar plan de estudio"}
          </DialogTitle>
        </DialogHeader>

        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? undefined : 4000}
        />

        <form
          id={FORM_ID}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex min-w-0 flex-col gap-4"
        >
          <form.Field name="asignaturaId">
            {(field) => {
              const isInvalid =
                (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
              const hasValue = !!field.state.value
              const nameMissing = hasValue && submissionAttempts > 0 && !subjectName.trim()
              const errors = nameMissing
                ? [...field.state.meta.errors, { message: "El nombre es obligatorio" }]
                : field.state.meta.errors
              return (
                <Field variant="outlined" data-invalid={isInvalid || nameMissing}>
                  <FieldLabel htmlFor={field.name}>
                    {isPreescolar ? "Dimensiones*" : "Asignaturas*"}
                  </FieldLabel>
                  {hasValue ? (
                    <div ref={pickerAnchorRef}>
                      <InputGroup className="h-11 rounded-md border border-input px-3 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
                        <InputGroupInput
                          id={field.name}
                          maxLength={130}
                          placeholder="Seleccionar"
                          className="px-0 uppercase placeholder:normal-case"
                          aria-invalid={isInvalid || nameMissing}
                          value={subjectName}
                          onBlur={field.handleBlur}
                          onChange={(e) => setSubjectName(e.target.value.toUpperCase())}
                        />
                        <InputGroupAddon align="inline-end">
                          <Combobox
                            open={pickerOpen}
                            onOpenChange={setPickerOpen}
                            value={String(field.state.value)}
                            onValueChange={(value) => {
                              if (value === CREATE_SUBJECT_VALUE) {
                                setPickerOpen(false)
                                setCreateSubjectOpen(true)
                                return
                              }
                              if (!value) return
                              const id = Number(value)
                              field.handleChange(id)
                              setSubjectName(
                                asignaturaOptions.find((o) => o.id === id)?.label ?? "",
                              )
                              setPickerOpen(false)
                            }}
                          >
                            <InputGroupButton
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Mostrar opciones"
                              onClick={() => setPickerOpen((o) => !o)}
                            >
                              <CaretDownIcon className="pointer-events-none size-3.5" />
                            </InputGroupButton>
                            <ComboboxFieldContent anchor={pickerAnchorRef}>
                              <ComboboxGroup>
                                {asignaturaOptions.length === 0 ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    {isPreescolar
                                      ? "No hay dimensiones disponibles para este grado."
                                      : "No hay asignaturas disponibles para este grado."}
                                  </div>
                                ) : (
                                  asignaturaOptions.map((option) => (
                                    <ComboboxFieldItem
                                      key={option.id}
                                      value={String(option.id)}
                                      title={option.label}
                                    >
                                      {option.label}
                                    </ComboboxFieldItem>
                                  ))
                                )}
                                <ComboboxFieldItem value={CREATE_SUBJECT_VALUE}>
                                  <span className="inline-flex items-center gap-1.5">
                                    <PlusIcon />
                                    Crear {subjectWord}
                                  </span>
                                </ComboboxFieldItem>
                              </ComboboxGroup>
                            </ComboboxFieldContent>
                          </Combobox>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>
                  ) : (
                    <ComboboxField
                      value=""
                      onValueChange={(value) => {
                        if (value === CREATE_SUBJECT_VALUE) {
                          setCreateSubjectOpen(true)
                          return
                        }
                        if (!value) return
                        const id = Number(value)
                        field.handleChange(id)
                        setSubjectName(asignaturaOptions.find((o) => o.id === id)?.label ?? "")
                      }}
                    >
                      <ComboboxFieldTrigger id={field.name} aria-invalid={isInvalid}>
                        <ComboboxFieldValue placeholder="Seleccionar">
                          {() => "Seleccionar"}
                        </ComboboxFieldValue>
                      </ComboboxFieldTrigger>
                      <ComboboxFieldContent>
                        <ComboboxGroup>
                          {asignaturaOptions.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              {isPreescolar
                                ? "No hay dimensiones disponibles para este grado."
                                : "No hay asignaturas disponibles para este grado."}
                            </div>
                          ) : (
                            asignaturaOptions.map((option) => (
                              <ComboboxFieldItem
                                key={option.id}
                                value={String(option.id)}
                                title={option.label}
                              >
                                {option.label}
                              </ComboboxFieldItem>
                            ))
                          )}
                          <ComboboxFieldItem value={CREATE_SUBJECT_VALUE}>
                            <span className="inline-flex items-center gap-1.5">
                              <PlusIcon />
                              Crear {subjectWord}
                            </span>
                          </ComboboxFieldItem>
                        </ComboboxGroup>
                      </ComboboxFieldContent>
                    </ComboboxField>
                  )}
                  {(isInvalid || nameMissing) && <FieldError errors={errors} />}
                  <QuickCreateSubjectDialog
                    academicPeriodId={academicPeriodId}
                    open={createSubjectOpen}
                    onOpenChange={setCreateSubjectOpen}
                    onSaved={handleSubjectCreated}
                    isPreescolar={isPreescolar}
                  />
                </Field>
              )
            }}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.asignaturaId}>
            {(asignaturaId) => {
              const selected = subjectDetails.find((s) => s.id === asignaturaId)
              if (!selected) return null
              return (
                <SubjectInlineEditFields
                  key={selected.id}
                  ref={subjectFieldsRef}
                  subject={selected}
                  nombre={subjectName}
                  onNombreChange={setSubjectName}
                  academicPeriodId={academicPeriodId}
                  isPreescolar={isPreescolar}
                  notify={notifyInDialog}
                  onSaved={(saved) => {
                    queryClient.invalidateQueries({
                      queryKey: ["subject-details", academicPeriodId],
                    })
                    if (saved.id !== asignaturaId) form.setFieldValue("asignaturaId", saved.id)
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <form.Field name="intensidadHoraria">
                      {(field) => {
                        const isInvalid =
                          (field.state.meta.isTouched || submissionAttempts > 0) &&
                          !field.state.meta.isValid
                        return (
                          <Field variant="outlined" data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Intensidad horaria*</FieldLabel>
                            <Input
                              id={field.name}
                              type="number"
                              min={1}
                              max={99}
                              step={1}
                              placeholder="Agregar"
                              aria-invalid={isInvalid}
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
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        )
                      }}
                    </form.Field>

                    <form.Field name="influenciaArea">
                      {(field) => {
                        const isInvalid =
                          (field.state.meta.isTouched || submissionAttempts > 0) &&
                          !field.state.meta.isValid
                        return (
                          <Field variant="outlined" data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Influencia área*</FieldLabel>
                            <InputGroup className="h-11 rounded-md border border-input px-3 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
                              <InputGroupInput
                                id={field.name}
                                type="number"
                                min={0}
                                max={100}
                                placeholder="Agregar"
                                className="px-0"
                                aria-invalid={isInvalid}
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
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        )
                      }}
                    </form.Field>

                    <form.Field name="numeroCreditos">
                      {(field) => {
                        const isInvalid =
                          (field.state.meta.isTouched || submissionAttempts > 0) &&
                          !field.state.meta.isValid
                        return (
                          <Field variant="outlined" data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Número de créditos *</FieldLabel>
                            <Input
                              id={field.name}
                              type="number"
                              min={0}
                              step={1}
                              placeholder="Agregar"
                              aria-invalid={isInvalid}
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
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        )
                      }}
                    </form.Field>
                  </div>
                </SubjectInlineEditFields>
              )
            }}
          </form.Subscribe>

          <label className="my-2 flex w-fit items-center gap-3 text-sm font-medium">
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
                <Field variant="outlined">
                  <FieldLabel>Influye en el desempeño académico (S/N)</FieldLabel>
                  <RadioGroup
                    className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
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
                <Field variant="outlined">
                  <FieldLabel>Matrícula obligatoria (S/N)</FieldLabel>
                  <RadioGroup
                    className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
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
                <Field variant="outlined">
                  <FieldLabel>Aprobación obligatoria (S/N)</FieldLabel>
                  <RadioGroup
                    className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
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

        <DialogFooter>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            Guardar
          </Button>
          <Button size="sm" type="button" variant="fill" color="neutral" onClick={requestClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          closeDialog()
        }}
      />
    </Dialog>
  )
}
