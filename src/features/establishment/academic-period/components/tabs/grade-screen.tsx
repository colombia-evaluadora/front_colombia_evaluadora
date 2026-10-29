import { useRef, useState } from "react"
import { useSelector } from "@tanstack/react-form"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { FormDisabledProvider, useAppForm, useFormDisabled } from "@/lib/forms"
import { cleanErrorMessage, getErrorMessage } from "@/lib/api-client"

import { TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import {
  NoticeOutlet,
  NoticeProvider,
  queueNotice,
  useNotify,
} from "@/components/notice/notice-context"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PERIOD_TAB_TRIGGER } from "@/features/establishment/academic-period/components/scroll-tabs-list"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowLeftIcon,
  CaretRightIcon,
  FloppyDiskIcon,
  InfoIcon,
  QuestionIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { toFieldErrors } from "@/lib/forms"
import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"

import { useCreateGrade } from "@/features/establishment/academic-period/api/mutations/create-grade"
import { useUpdateGrade } from "@/features/establishment/academic-period/api/mutations/update-grade"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import {
  useGradosCatalogQuery,
  useJornadasQuery,
} from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import {
  gradeFormSchema,
  type GradeFormInput,
} from "@/features/establishment/academic-period/api/schema"
import type { Grade } from "@/features/establishment/academic-period/api/types/grade"
import { DeleteGradeDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-grade"
import { FormSection } from "@/features/establishment/academic-period/components/fields/form-section"
import {
  asScheduleForm,
  JornadaScheduleFields,
} from "@/features/establishment/academic-period/components/fields/jornada-schedule-fields"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/fields/subjects-multi-select"
import { TabGradeGroups } from "@/features/establishment/academic-period/components/tabs/tab-grade-groups"
import { TabStudyPlan } from "@/features/establishment/academic-period/components/tabs/tab-study-plan"
import {
  TabPromotionCriteria,
  type PromotionCriteriaHandle,
} from "@/features/establishment/academic-period/components/tabs/tab-promotion-criteria"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"
import { toPeriodTitle } from "@/features/establishment/academic-period/utils/period-title"
import { getRecesoTimes } from "@/features/establishment/academic-period/utils/recesos"
import {
  PeriodReadOnlyNotice,
  usePeriodReadOnly,
} from "@/features/establishment/academic-period/utils/period-read-only"

const FORM_ID = "grade-form"

interface GradeScreenProps {
  academicPeriodId?: number
  // null = grado nuevo.
  gradeId: number | null
  grades: Grade[]
  onBack: () => void
  onCreated: (id: number) => void
}

// Pantalla del grado (Sección 5.3): datos arriba con Eliminar/Cancelar/Guardar
// en la cabecera y, después del primer guardado, Grupos, Plan de estudio y
// Criterios de promoción del grado.
export function GradeScreen({
  academicPeriodId,
  gradeId,
  grades,
  onBack,
  onCreated,
}: GradeScreenProps) {
  const { notify } = useNotify()
  const grade = gradeId != null ? grades.find((g) => g.id === gradeId) : undefined
  const isEditing = grade != null

  const { data: period } = useAcademicPeriodQuery(academicPeriodId)
  // Regla 16: con el período Cerrado el grado y sus pestañas son de solo lectura.
  const { readOnly } = usePeriodReadOnly()
  const { data: levels = [] } = useTeachingLevelsQuery()
  const { data: gradosCatalog = [] } = useGradosCatalogQuery()
  const { data: jornadas = [] } = useJornadasQuery()
  const periodJornadaId = period?.config.jornadaId
  const jornadaName = jornadas.find((j) => j.id === periodJornadaId)?.name
  const subtitle = period ? toPeriodTitle(period, jornadaName) : ""

  // El grado se guarda con el VALOR del catálogo; las filas del listado traen el nombre.
  const valorOf = (nameOrValor: string | undefined) =>
    gradosCatalog.find((o) => o.valor === nameOrValor || o.nombre === nameOrValor)?.valor ?? ""

  const periodSchedule = {
    scheduleStartTime: period?.config.scheduleStartTime ?? "",
    scheduleEndTime: period?.config.scheduleEndTime ?? "",
    defaultBlocksCount: period?.config.defaultBlocksCount ?? null,
    breaks: period?.config.breaks ?? [],
  }

  const defaultValues: GradeFormInput = grade
    ? {
        teachingLevelId: grade.teachingLevelId,
        nombre: valorOf(grade.grado || grade.nombre),
        tieneGradoSiguiente: grade.tieneGradoSiguiente ?? false,
        gradoSiguiente: valorOf(grade.gradoSiguiente ?? grade.gradoSiguienteName),
        jornadasContinuidad: (grade.jornadasContinuidad ?? []).map((j) => j.id),
        personalizarHorario: grade.personalizarHorario ?? false,
        ...(grade.personalizarHorario
          ? {
              scheduleStartTime: grade.horaInicio ?? "",
              scheduleEndTime: grade.horaFin ?? "",
              defaultBlocksCount: grade.bloques ?? null,
              breaks: grade.recesos ?? [],
            }
          : periodSchedule),
      }
    : {
        teachingLevelId: 0,
        nombre: "",
        tieneGradoSiguiente: true,
        gradoSiguiente: "",
        // Por defecto, la jornada del período (Regla 88).
        jornadasContinuidad: periodJornadaId ? [periodJornadaId] : [],
        personalizarHorario: false,
        ...periodSchedule,
      }

  const promotionRef = useRef<PromotionCriteriaHandle>(null)
  const createGrade = useCreateGrade()
  const updateGrade = useUpdateGrade()
  const isSaving = createGrade.isPending || updateGrade.isPending

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: gradeFormSchema },
    onSubmit: async ({ value, formApi }) => {
      const payload = {
        nombre: value.nombre,
        grado: value.nombre,
        teachingLevelId: value.teachingLevelId,
        tieneGradoSiguiente: value.tieneGradoSiguiente,
        gradoSiguiente: value.tieneGradoSiguiente ? value.gradoSiguiente : undefined,
        jornadasContinuidad: value.tieneGradoSiguiente
          ? jornadas
              .filter((j) => value.jornadasContinuidad.includes(j.id))
              .map((j) => ({ id: j.id, name: j.name }))
          : [],
        personalizarHorario: value.personalizarHorario,
        horaInicio: value.scheduleStartTime,
        horaFin: value.scheduleEndTime,
        bloques: value.defaultBlocksCount,
        recesos: value.breaks,
      }
      try {
        if (!isEditing) {
          const created = await createGrade.mutateAsync({ ...payload, academicPeriodId })
          // Se muestra en la página del grado ya creado.
          queueNotice(
            `${SUCCESS_MESSAGES.grade.created} Ahora puede agregar sus grupos y su plan de estudio.`,
          )
          onCreated(created.id)
          return
        }
        const result = await updateGrade.mutateAsync({ id: grade.id, values: payload })
        if (result.status === "error") {
          notify(cleanErrorMessage(result.message), { variant: "error" })
          return
        }
        formApi.reset(value)
        // Guardar también guarda los criterios de promoción del grado, si cambiaron.
        await promotionRef.current?.save(grade.id)
        notify(SUCCESS_MESSAGES.grade.updated)
      } catch (error) {
        notify(getErrorMessage(error), { variant: "error" })
      }
    },
  })

  const [confirmDiscard, setConfirmDiscard] = useState(false)
  function requestBack() {
    if (isSaving) return
    if (!formValuesEqual(form.state.values, defaultValues) || promotionRef.current?.isDirty()) {
      setConfirmDiscard(true)
      return
    }
    onBack()
  }

  const values = useSelector(form.store, (s) => ({
    teachingLevelId: s.values.teachingLevelId,
    nombre: s.values.nombre,
    tieneGradoSiguiente: s.values.tieneGradoSiguiente,
    personalizarHorario: s.values.personalizarHorario,
  }))
  const level = levels.find((l) => l.id === values.teachingLevelId)
  // Solo grados del nivel elegido, si el catálogo de niveles trae sus grados.
  const gradeOptions = gradosCatalog
    .filter((o) => !level?.grados?.length || level.grados.includes(o.nombre))
    .map((o) => ({ value: o.valor, label: o.nombre }))
  const isPreescolar = (level?.nombre ?? grade?.teachingLevelName ?? "")
    .toLowerCase()
    .includes("preescolar")
  const title = isEditing
    ? (gradosCatalog.find((o) => o.valor === defaultValues.nombre)?.nombre ?? grade.nombre)
    : "Nuevo grado"

  const { data: referente } = useReferenteCurricularQuery(gradeId ?? undefined, undefined)
  const isFormativo = referente?.esFormativo ?? false

  return (
    <>
      {/* Mismo encabezado fijo que el del período (TableScreenHeader). */}
      <TableScreenHeader>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-table-screen-title px-(--screen-spacing) py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <nav aria-label="Ruta">
              <button
                type="button"
                onClick={requestBack}
                className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground focus-visible:underline focus-visible:outline-none"
              >
                Grados
                <CaretRightIcon className="size-4" aria-hidden />
              </button>
            </nav>
            <h1 className="font-heading truncate text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {isEditing && !readOnly && (
              <>
                <DeleteGradeDialog grade={grade} variant="button" onDeleted={onBack} />
                <span aria-hidden className="mx-1 h-6 w-px bg-border" />
              </>
            )}
            <Button size="sm" variant="outline" color="neutral" onClick={requestBack}>
              {readOnly ? (
                <ArrowLeftIcon data-icon="inline-start" />
              ) : (
                <XIcon data-icon="inline-start" />
              )}
              {readOnly ? "Volver" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button
                size="sm"
                color="primary"
                type="submit"
                form={FORM_ID}
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
            )}
          </div>
        </div>
      </TableScreenHeader>

      <TableScreenBody className="flex flex-col gap-4">
        <NoticeOutlet />
        <PeriodReadOnlyNotice what="el grado" className="mb-4" />

        <FormDisabledProvider disabled={readOnly}>
          <form
            id={FORM_ID}
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FormSection title="Datos del grado">
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <form.AppField
                  name="teachingLevelId"
                  listeners={{ onChange: () => form.setFieldValue("nombre", "") }}
                >
                  {(field) => (
                    <field.SelectField
                      label="Nivel de enseñanza"
                      required
                      emptyValue={0}
                      placeholder="Seleccione..."
                      options={levels.map((l) => ({ value: l.id, label: l.nombre }))}
                    />
                  )}
                </form.AppField>
                <form.AppField name="nombre">
                  {(field) => (
                    <field.SelectField
                      label="Nombre"
                      required
                      placeholder="Seleccione..."
                      disabled={!values.teachingLevelId}
                      options={gradeOptions}
                    />
                  )}
                </form.AppField>
                <form.Field
                  name="tieneGradoSiguiente"
                  listeners={{
                    // Con No, el grado siguiente y las jornadas quedan vacíos (Reglas 54 y 88).
                    onChange: ({ value }) => {
                      if (value) return
                      form.setFieldValue("gradoSiguiente", "")
                      form.setFieldValue("jornadasContinuidad", [])
                    },
                  }}
                >
                  {(field) => (
                    <YesNoSwitch
                      id={field.name}
                      label="Tiene grado siguiente"
                      checked={field.state.value}
                      onChange={(checked) => field.handleChange(checked)}
                    />
                  )}
                </form.Field>
                <form.AppField name="gradoSiguiente">
                  {(field) => (
                    <field.SelectField
                      label="Grado siguiente"
                      required={values.tieneGradoSiguiente}
                      placeholder="Seleccione..."
                      disabled={!values.tieneGradoSiguiente}
                      options={gradosCatalog
                        .filter((o) => o.valor !== values.nombre)
                        .map((o) => ({ value: o.valor, label: o.nombre }))}
                    />
                  )}
                </form.AppField>

                <form.Field
                  name="personalizarHorario"
                  listeners={{
                    // Al activarlo se precarga con el horario de la jornada (Regla 87).
                    onChange: ({ value }) => {
                      if (!value) return
                      form.setFieldValue("scheduleStartTime", periodSchedule.scheduleStartTime)
                      form.setFieldValue("scheduleEndTime", periodSchedule.scheduleEndTime)
                      form.setFieldValue("defaultBlocksCount", periodSchedule.defaultBlocksCount)
                      form.setFieldValue("breaks", periodSchedule.breaks)
                    },
                  }}
                >
                  {(field) => (
                    <YesNoSwitch
                      id={field.name}
                      label="Personalizar horario"
                      required
                      help="Con Sí, el grado tiene su propia hora inicio, hora final, bloques y recesos (p. ej. Transición de 7:00 a 11:30)."
                      checked={field.state.value}
                      onChange={(checked) => field.handleChange(checked)}
                    />
                  )}
                </form.Field>
                <form.Field name="jornadasContinuidad">
                  {(field) => {
                    const invalid = form.state.submissionAttempts > 0 && !field.state.meta.isValid
                    return (
                      <Field
                        variant="outlined"
                        className="sm:col-span-1 lg:col-span-3"
                        data-invalid={invalid || undefined}
                      >
                        <FieldLabel htmlFor="grade-jornadas">
                          Jornadas de continuidad
                          {values.tieneGradoSiguiente ? <span className="text-red"> *</span> : null}
                        </FieldLabel>
                        <SubjectsMultiSelect
                          id="grade-jornadas"
                          options={jornadas.map((j) => ({ id: j.id, label: j.name }))}
                          value={field.state.value}
                          onChange={(ids) => field.handleChange(ids)}
                          placeholder={
                            values.tieneGradoSiguiente ? "Seleccione..." : "Sin grado siguiente"
                          }
                          emptyMessage="La sede no tiene jornadas."
                          disabled={!values.tieneGradoSiguiente || readOnly}
                        />
                        {invalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
                      </Field>
                    )
                  }}
                </form.Field>
              </div>

              {values.personalizarHorario ? (
                <div className="mt-5 flex flex-col gap-5">
                  <JornadaScheduleFields
                    form={asScheduleForm(form)}
                    blocksLabel="Número de bloques"
                  />
                </div>
              ) : (
                <p className="mt-5 flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
                  <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
                  Personalizar horario en No: el grado usa el horario de la jornada (
                  {describeSchedule(periodSchedule)}).
                </p>
              )}
            </FormSection>
          </form>
        </FormDisabledProvider>

        {isEditing && gradeId != null && (
          <Tabs defaultValue="grupos" className="mt-2 w-full min-w-0">
            <TabsList
              variant="line"
              className="h-11 w-full justify-start gap-4 border-b border-border p-0"
            >
              <TabsTrigger value="grupos" className={PERIOD_TAB_TRIGGER}>
                Grupos
              </TabsTrigger>
              <TabsTrigger value="plan" className={PERIOD_TAB_TRIGGER}>
                Plan de estudio
              </TabsTrigger>
              <TabsTrigger value="promocion" className={PERIOD_TAB_TRIGGER}>
                Criterios de promoción del grado
              </TabsTrigger>
            </TabsList>
            <TabsContent value="grupos" className="pt-4">
              <NoticeProvider>
                <TabGradeGroups
                  gradeId={gradeId}
                  academicPeriodId={academicPeriodId}
                  grade={grade}
                />
              </NoticeProvider>
            </TabsContent>
            <TabsContent value="plan" className="pt-4">
              <NoticeProvider>
                <TabStudyPlan
                  academicPeriodId={academicPeriodId}
                  gradeId={gradeId}
                  gradeName={title}
                  isPreescolar={isPreescolar}
                  isFormativo={isFormativo}
                />
              </NoticeProvider>
            </TabsContent>
            {/* keepMounted: los cambios sin guardar siguen ahí al volver de otra pestaña y Guardar los ve. */}
            <TabsContent value="promocion" className="pt-4" keepMounted>
              <NoticeProvider>
                <TabPromotionCriteria
                  ref={promotionRef}
                  hideSubmit
                  gradeId={gradeId}
                  gradeName={title}
                  periodTitle={subtitle}
                  academicPeriodId={academicPeriodId}
                  isPreescolar={isPreescolar}
                  // Referente Formativo: solo lectura con su aviso (Regla 106, punto 5).
                  readOnly={isFormativo}
                />
              </NoticeProvider>
            </TabsContent>
          </Tabs>
        )}

        <ConfirmDiscardDialog
          open={confirmDiscard}
          onOpenChange={setConfirmDiscard}
          onConfirm={() => {
            setConfirmDiscard(false)
            onBack()
          }}
        />
      </TableScreenBody>
    </>
  )
}

// "06:00 a 12:00 · 6 bloques · Recreo 08:45–09:15"
function describeSchedule(s: {
  scheduleStartTime: string
  scheduleEndTime: string
  defaultBlocksCount: number | null
  breaks: GradeFormInput["breaks"]
}): string {
  const times = getRecesoTimes(
    s.scheduleStartTime,
    s.scheduleEndTime,
    s.defaultBlocksCount,
    s.breaks,
  )
  return [
    s.scheduleStartTime && s.scheduleEndTime
      ? `${s.scheduleStartTime} a ${s.scheduleEndTime}`
      : null,
    s.defaultBlocksCount ? `${s.defaultBlocksCount} bloques` : null,
    ...s.breaks.map((b, i) =>
      times[i] ? `${b.label} ${times[i].startTime}–${times[i].endTime}` : null,
    ),
  ]
    .filter(Boolean)
    .join(" · ")
}

function YesNoSwitch({
  id,
  label,
  required,
  help,
  checked,
  onChange,
}: {
  id: string
  label: string
  required?: boolean
  help?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const disabled = useFormDisabled()
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 text-sm">
        <label htmlFor={id}>
          {label}
          {required ? <span className="text-red"> *</span> : null}
        </label>
        {help && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="text-muted-foreground"
                  aria-label={`Ayuda: ${label}`}
                />
              }
            >
              <QuestionIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{help}</TooltipContent>
          </Tooltip>
        )}
      </span>
      <label className="flex w-fit cursor-pointer items-center gap-2">
        <Switch
          id={id}
          disabled={disabled}
          checked={checked}
          onCheckedChange={onChange}
          className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
        />
        <span className="text-sm">{checked ? "Sí" : "No"}</span>
      </label>
    </div>
  )
}
