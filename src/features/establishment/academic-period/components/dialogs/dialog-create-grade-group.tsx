import { useRef, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"
import { ControlPointIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { getErrorMessage } from "@/lib/api-client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
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
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { useAssignmentTeachersQuery } from "@/features/establishment/academic-period/api/query/use-assignment-teachers"

import { useCreateGradeGroup } from "@/features/establishment/academic-period/api/mutations/create-grade-group"
import { useUpdateGradeGroup } from "@/features/establishment/academic-period/api/mutations/update-grade-group"
import { useMetodologiasQuery } from "@/features/establishment/academic-period/api/query/use-metodologias"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/use-jornadas"
import type { GradeGroup } from "@/features/establishment/academic-period/api/types/grade-group"
import {
  gradeGroupFormSchema,
  type GradeGroupFormValues,
} from "@/features/establishment/academic-period/api/schema"

const EMPTY: GradeGroupFormValues = {
  codigo: "",
  directorId: null,
  metodologia: "",
  cupo: 0,
}

const FORM_ID = "grade-group-form"

interface CreateGradeGroupDialogProps {
  gradeId?: number
  academicPeriodId?: number
  gradeGroup?: GradeGroup
}

export function CreateGradeGroupDialog({
  gradeId,
  academicPeriodId,
  gradeGroup,
}: CreateGradeGroupDialogProps) {
  const isEditing = gradeGroup != null
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

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

  const { data: academicPeriod } = useAcademicPeriodQuery(academicPeriodId)
  const { data: metodologiaOptions = [] } = useMetodologiasQuery()
  const { data: jornadas = [] } = useJornadasQuery()
  const jornadaName =
    jornadas.find((j) => j.id === academicPeriod?.config.jornadaId)?.name ??
    gradeGroup?.jornada ??
    ""

  const { data: assignmentTeachers } = useAssignmentTeachersQuery({
    academicPeriodId,
    sorting: [],
    pageIndex: 0,
    pageSize: 200,
  })
  const teachers = assignmentTeachers?.rows ?? []

  const defaultValues: GradeGroupFormValues = gradeGroup
    ? {
        codigo: gradeGroup.codigo,
        directorId: gradeGroup.directorId,
        metodologia: gradeGroup.metodologia ?? "",
        cupo: gradeGroup.cupo ?? 0,
      }
    : EMPTY

  const createGradeGroup = useCreateGradeGroup({
    mutationConfig: {
      onSuccess: () => {
        notify(SUCCESS_MESSAGES.gradeGroup.created)
        form.reset()
        setOpen(false)
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error))
      },
    },
  })

  const updateGradeGroup = useUpdateGradeGroup({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notifyInDialog(result.message)
          return
        }
        notify(SUCCESS_MESSAGES.gradeGroup.updated)
        setOpen(false)
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error))
      },
    },
  })

  const isSaving = createGradeGroup.isPending || updateGradeGroup.isPending

  const form = useForm({
    defaultValues,
    validators: { onSubmit: gradeGroupFormSchema },
    onSubmit: ({ value }) => {
      const values = { ...gradeGroupFormSchema.parse(value), jornada: jornadaName }
      if (isEditing) {
        updateGradeGroup.mutate({ id: gradeGroup.id, values })
      } else {
        createGradeGroup.mutate({ ...values, gradeId })
      }
    },
  })

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  function closeDialog() {
    setOpen(false)
    setNotice(null)
    form.reset()
  }

  function requestClose() {
    if (isSaving) return
    if (JSON.stringify(form.state.values) !== JSON.stringify(defaultValues)) {
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
      {isEditing ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
            }
          >
            <span className="sr-only">Editar grupo</span>
            <PencilIcon />
          </TooltipTrigger>
          <TooltipContent>Editar grupo</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger render={<Button color="primary" size="sm" />}>
          <ControlPointIcon data-icon="inline-start" />
          Agregar
        </DialogTrigger>
      )}
      <DialogPortal>
        <DialogOverlay forceRender className="bg-transparent" />
      </DialogPortal>
      <DialogContent className="sm:max-w-3xl" showCloseButton={false} inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grupo" : "Agregar grupo"}</DialogTitle>
          <DialogDescription>Completa los datos del grupo.</DialogDescription>
        </DialogHeader>

        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? undefined : 4000}
        />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-4 sm:grid-cols-3"
        >
          <form.Field name="codigo">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field variant="outlined" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Grupo*</FieldLabel>
                  <Input
                    id={field.name}
                    maxLength={2}
                    placeholder="Agregar"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <Field variant="outlined">
            <FieldLabel htmlFor="grade-group-jornada">Jornada*</FieldLabel>
            <Input
              id="grade-group-jornada"
              readOnly
              disabled
              placeholder="Definida en el periodo académico"
              value={jornadaName}
            />
          </Field>

          <form.Field name="directorId">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>Director de grupo</FieldLabel>
                <ComboboxField
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange((value ?? null) as number | null)}
                >
                  <ComboboxFieldTrigger id={field.name}>
                    <ComboboxFieldValue>
                      {(value) => teachers.find((t) => t.id === value)?.name ?? "Seleccionar"}
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      {teachers.map((teacher) => (
                        <ComboboxFieldItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            )}
          </form.Field>

          <form.Field name="metodologia">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>Metodología*</FieldLabel>
                <ComboboxField
                  value={field.state.value}
                  onValueChange={(value) => value && field.handleChange(value)}
                >
                  <ComboboxFieldTrigger id={field.name}>
                    <ComboboxFieldValue>
                      {(value) =>
                        metodologiaOptions.find((o) => o.key === value)?.label ?? "Seleccionar"
                      }
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      {metodologiaOptions.map((option) => (
                        <ComboboxFieldItem key={option.key} value={option.key} title={option.label}>
                          {option.label}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            )}
          </form.Field>

          <form.Field name="cupo">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>Cupo*</FieldLabel>
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
                      field.handleChange(Number.isFinite(value) ? Math.min(value, 99) : value)
                    }
                  }}
                />
              </Field>
            )}
          </form.Field>
        </form>

        <DialogFooter>
          <form.Subscribe
            selector={(state) => gradeGroupFormSchema.safeParse(state.values).success}
          >
            {(isComplete) =>
              isComplete ? (
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
              ) : null
            }
          </form.Subscribe>
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
