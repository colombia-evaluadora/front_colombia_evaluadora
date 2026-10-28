import { useState } from "react"
import { z } from "zod"
import { useSelector } from "@tanstack/react-form"

import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, InfoIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { isFieldInvalid, toFieldErrors } from "@/lib/forms"

import { useSaveAcademicAssignment } from "@/features/establishment/academic-period/api/mutations/academic-assignments"
import { useAssignmentTeachersQuery } from "@/features/establishment/academic-period/api/query/use-assignment-teachers"
import { useAcademicAssignmentsQuery } from "@/features/establishment/academic-period/api/query/use-academic-assignments"
import { useGradeGroupsQuery } from "@/features/establishment/academic-period/api/query/use-grade-groups"
import { useGradesQuery } from "@/features/establishment/academic-period/api/query/use-grades"
import { useStudyPlansQuery } from "@/features/establishment/academic-period/api/query/use-study-plans"
import type { AcademicAssignment } from "@/features/establishment/academic-period/api/types/academic-assignment"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/fields/subjects-multi-select"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"

const FORM_ID = "academic-assignment-form"

// Campos de la Sección 5.4. La asignación única (Regla 69) la valida el back.
// Modificar trabaja sobre un solo grupo (`groupId`); crear, sobre varios (`groupIds`).
function makeAssignmentSchema(isEditing: boolean) {
  return z
    .object({
      funcionarioId: z.string().min(1, required("El docente")),
      gradeId: z.number().min(1, required("El grado")),
      groupId: z.number(),
      groupIds: z.array(z.number()),
      subjectId: z.number().min(1, required("La asignatura", { femenino: true })),
    })
    .superRefine((data, ctx) => {
      if (isEditing && data.groupId <= 0) {
        ctx.addIssue({ code: "custom", message: required("El grupo"), path: ["groupId"] })
      }
      if (!isEditing && data.groupIds.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Seleccione al menos un grupo.",
          path: ["groupIds"],
        })
      }
    })
}

type AssignmentValues = z.infer<ReturnType<typeof makeAssignmentSchema>>

interface AcademicAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  academicPeriodId: number
  // "IE Central · Mañana" para la ayuda del selector de Docente.
  sedeJornada: string
  // Modificar una asignación (un solo grupo); sin ella crea una por grupo.
  assignment?: AcademicAssignment | null
}

export function AcademicAssignmentDialog({
  open,
  onOpenChange,
  academicPeriodId,
  sedeJornada,
  assignment,
}: AcademicAssignmentDialogProps) {
  const isEditing = assignment != null
  const { notify } = useNotify()
  const [notice, setNotice] = useState<{
    id: number
    message: string
    variant: NoticeVariant
  } | null>(null)
  const saveMutation = useSaveAcademicAssignment()
  const isSaving = saveMutation.isPending

  const defaultValues: AssignmentValues = {
    funcionarioId: assignment?.funcionarioId ?? "",
    gradeId: assignment?.gradeId ?? 0,
    groupId: assignment?.groupId ?? 0,
    groupIds: [],
    subjectId: assignment?.subjectId ?? 0,
  }

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: makeAssignmentSchema(isEditing) },
    onSubmit: ({ value }) => {
      setNotice(null)
      const groupIds = isEditing ? [value.groupId] : value.groupIds
      saveMutation.mutate(
        {
          academicPeriodId,
          id: assignment?.id,
          funcionarioId: value.funcionarioId,
          groupIds,
          subjectId: value.subjectId,
        },
        {
          onSuccess: () => {
            const count = groupIds.length
            notify(
              isEditing
                ? SUCCESS_MESSAGES.academicAssignment.updated
                : count === 1
                  ? SUCCESS_MESSAGES.academicAssignment.created
                  : `Se crearon ${count} asignaciones académicas.`,
            )
            close()
          },
          onError: (error) =>
            setNotice({ id: Date.now(), message: getErrorMessage(error), variant: "error" }),
        },
      )
    },
  })

  const values = useSelector(form.store, (s) => s.values)
  const submissionAttempts = useSelector(form.store, (s) => s.submissionAttempts)

  const { data: teachersData } = useAssignmentTeachersQuery({
    academicPeriodId,
    sorting: [{ id: "name", desc: false }],
    pageIndex: 0,
    pageSize: 500,
  })
  // Solo docentes con el rol activo (Reglas 7 y 68).
  const activeTeachers = (teachersData?.rows ?? []).filter((t) => t.statuses.includes("ACTIVE"))
  // Al modificar, el docente actual se muestra aunque ya no tenga el rol activo.
  const teacherOptions = activeTeachers.map((t) => ({ value: String(t.id), label: t.name }))
  if (assignment && !teacherOptions.some((o) => o.value === assignment.funcionarioId)) {
    teacherOptions.unshift({ value: assignment.funcionarioId, label: assignment.docente })
  }
  const { data: assignments } = useAcademicAssignmentsQuery(academicPeriodId)
  const { data: gradesData } = useGradesQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 200,
    academicPeriodId,
  })
  const grades = gradesData?.rows ?? []
  const hasGrade = values.gradeId > 0
  const { data: groupsData } = useGradeGroupsQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    gradeId: values.gradeId,
    enabled: hasGrade,
  })
  const groups = hasGrade ? (groupsData?.rows ?? []) : []
  const { data: planData } = useStudyPlansQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    academicPeriodId,
    gradeId: values.gradeId,
    enabled: hasGrade,
  })
  // Una asignatura del plan aparece una vez aunque tenga varias especialidades.
  const subjects = [
    ...new Map((hasGrade ? (planData?.rows ?? []) : []).map((p) => [p.asignaturaId, p.asignatura])),
  ].map(([value, label]) => ({ value, label }))

  const teacherName = teacherOptions.find((o) => o.value === values.funcionarioId)?.label
  const gradeName = grades.find((g) => g.id === values.gradeId)?.nombre
  const groupNames = values.groupIds
    .map((id) => groups.find((g) => g.id === id)?.codigo)
    .filter(Boolean) as string[]
  const subjectName = subjects.find((s) => s.value === values.subjectId)?.label
  // Regla 69: cada asignatura de un grupo tiene un solo docente.
  const selectedGroupIds = isEditing ? [values.groupId] : values.groupIds
  const taken = (assignments ?? []).filter(
    (a) =>
      a.id !== assignment?.id &&
      a.subjectId === values.subjectId &&
      selectedGroupIds.includes(a.groupId),
  )
  const takenMessage =
    taken.length === 0
      ? null
      : taken.length === 1
        ? `${taken[0].asignatura} en ${taken[0].grupo} ya está asignada a ${taken[0].docente}. Elimine esa asignación para asignarla a otro.`
        : `${taken[0].asignatura} ya está asignada en: ${taken.map((a) => `${a.grupo} (${a.docente})`).join(", ")}. Elimine esas asignaciones para asignarla a otro.`
  const summaryReady =
    !isEditing && !takenMessage && teacherName && gradeName && groupNames.length > 0 && subjectName

  function close() {
    onOpenChange(false)
    setNotice(null)
    form.reset(defaultValues)
  }

  const {
    confirmDiscardOpen,
    requestClose,
    onOpenChange: guardedOpenChange,
    discardDialogProps,
  } = useGuardedDialog({
    isSaving,
    isDirty: () => !formValuesEqual(form.state.values, defaultValues),
    onOpen: () => {},
    onClose: close,
  })

  return (
    <Dialog open={open} onOpenChange={guardedOpenChange}>
      <DialogContent className="sm:max-w-xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modificar asignación académica" : "Nueva asignación académica"}
          </DialogTitle>
        </DialogHeader>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant={notice?.variant} />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <form.AppField name="funcionarioId">
              {(field) => (
                <field.SelectField
                  label="Docente"
                  required
                  placeholder="Seleccione"
                  description={`Docentes con rol Docente activo en ${sedeJornada}.`}
                  options={teacherOptions}
                />
              )}
            </form.AppField>
          </div>

          <form.AppField
            name="gradeId"
            listeners={{
              // Cascada (Sección 5.4): al cambiar el grado se reinician grupos y asignatura.
              onChange: () => {
                form.setFieldValue("groupId", 0)
                form.setFieldValue("groupIds", [])
                form.setFieldValue("subjectId", 0)
              },
            }}
          >
            {(field) => (
              <field.SelectField
                label="Grado"
                required
                emptyValue={0}
                placeholder="Seleccione"
                options={grades.map((g) => ({ value: g.id, label: g.nombre }))}
              />
            )}
          </form.AppField>

          {isEditing ? (
            <form.AppField name="groupId">
              {(field) => (
                <field.SelectField
                  label="Grupo"
                  required
                  emptyValue={0}
                  placeholder="Seleccione"
                  disabled={!hasGrade}
                  options={groups.map((g) => ({ value: g.id, label: g.codigo }))}
                />
              )}
            </form.AppField>
          ) : (
            <form.Field name="groupIds">
              {(field) => {
                const invalid = isFieldInvalid(field, submissionAttempts)
                return (
                  <Field variant="outlined" data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor="assignment-groups">
                      Grupos<span className="text-red"> *</span>
                    </FieldLabel>
                    <SubjectsMultiSelect
                      id="assignment-groups"
                      options={groups.map((g) => ({ id: g.id, label: g.codigo }))}
                      value={field.state.value}
                      onChange={(next) => field.handleChange(next)}
                      disabled={!hasGrade}
                      placeholder={hasGrade ? "Seleccione" : "Elija primero el grado"}
                      emptyMessage="El grado aún no tiene grupos."
                    />
                    {invalid ? (
                      <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                    ) : (
                      hasGrade && (
                        <FieldDescription>
                          {field.state.value.length} de {groups.length} seleccionados. Se crea una
                          asignación por grupo.
                        </FieldDescription>
                      )
                    )}
                  </Field>
                )
              }}
            </form.Field>
          )}

          <div className="sm:col-span-2">
            <form.AppField name="subjectId">
              {(field) => (
                <field.SelectField
                  label="Asignatura"
                  required
                  emptyValue={0}
                  placeholder="Seleccione"
                  disabled={!hasGrade}
                  description={
                    gradeName ? `Asignaturas del plan de estudio de ${gradeName}.` : undefined
                  }
                  options={subjects}
                />
              )}
            </form.AppField>
          </div>
        </form>

        {takenMessage && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red-stroke bg-red-22 px-3 py-2 text-sm"
          >
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-red" aria-hidden />
            <span>{takenMessage}</span>
          </p>
        )}

        {summaryReady && (
          <p className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
            <span>
              Se crearán {groupNames.length}{" "}
              {groupNames.length === 1 ? "asignación" : "asignaciones"}: {teacherName} · {gradeName}{" "}
              · {formatList(groupNames)} · {subjectName}.
            </span>
          </p>
        )}

        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={isSaving || Boolean(takenMessage)}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}

// "6°B y 6°C", "6°A, 6°B y 6°C".
function formatList(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
}
