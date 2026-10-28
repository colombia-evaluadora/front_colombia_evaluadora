import { useRef, useState } from "react"
import { useSelector } from "@tanstack/react-form"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useAppForm } from "@/lib/forms"
import { FloppyDiskIcon, LockIcon, PencilIcon, PlusIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

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
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { useAssignmentTeachersQuery } from "@/features/establishment/academic-period/api/query/use-assignment-teachers"
import { useCreateGradeGroup } from "@/features/establishment/academic-period/api/mutations/create-grade-group"
import { useUpdateGradeGroup } from "@/features/establishment/academic-period/api/mutations/update-grade-group"
import { useJornadasQuery, useMetodologiasQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import { usePredeterminadoQuery } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import type { GradeGroup } from "@/features/establishment/academic-period/api/types/grade-group"
import {
  gradeGroupFormSchema,
  type GradeGroupFormValues,
} from "@/features/establishment/academic-period/api/schema"
import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"
import { toPeriodoLongTextInput } from "@/features/establishment/academic-period/utils/text-input"

const FORM_ID = "grade-group-form"

interface CreateGradeGroupDialogProps {
  gradeId?: number
  academicPeriodId?: number
  gradeGroup?: GradeGroup
}

// Agregar o modificar un grupo del grado (Sección 5.3, Reglas 18, 55, 56 y 108).
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
  const { data: metodologiaPredeterminada } = usePredeterminadoQuery("MODELO_PEDAGOGICO")
  // El grupo hereda la jornada del período y no se cambia.
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
        dictaTodas: gradeGroup.dictaTodas ?? false,
        metodologia: gradeGroup.metodologia ?? "",
        cupo: gradeGroup.cupo ?? Number.NaN,
      }
    : {
        codigo: "",
        directorId: null,
        dictaTodas: false,
        // Metodología arranca en el predeterminado de Listas valor (si hay).
        metodologia: metodologiaPredeterminada?.valor ?? "",
        // El Cupo inicia vacío (Regla 56).
        cupo: Number.NaN,
      }

  const createGradeGroup = useCreateGradeGroup({
    mutationConfig: {
      onSuccess: () => {
        notify(SUCCESS_MESSAGES.gradeGroup.created)
        form.reset()
        setOpen(false)
      },
      onError: (error) => notifyInDialog(getErrorMessage(error)),
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
      onError: (error) => notifyInDialog(getErrorMessage(error)),
    },
  })

  const isSaving = createGradeGroup.isPending || updateGradeGroup.isPending

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: gradeGroupFormSchema },
    onSubmit: ({ value }) => {
      const values = {
        ...value,
        codigo: value.codigo.trim(),
        dictaTodas: value.directorId != null && value.dictaTodas,
        jornada: jornadaName,
      }
      if (isEditing) {
        updateGradeGroup.mutate({ id: gradeGroup.id, values })
      } else {
        createGradeGroup.mutate({ ...values, gradeId })
      }
    },
  })

  const directorId = useSelector(form.store, (s) => s.values.directorId)

  function closeDialog() {
    setOpen(false)
    setNotice(null)
    form.reset()
  }

  const { confirmDiscardOpen, requestClose, onOpenChange, discardDialogProps } = useGuardedDialog({
    isSaving,
    isDirty: () => !formValuesEqual(form.state.values, defaultValues),
    onOpen: () => {
      setOpen(true)
      setNotice(null)
      form.reset(defaultValues)
    },
    onClose: closeDialog,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {isEditing ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
            }
          >
            <span className="sr-only">Modificar grupo {gradeGroup.codigo}</span>
            <PencilIcon />
          </TooltipTrigger>
          <TooltipContent>Modificar grupo</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger render={<Button color="primary" size="sm" />}>
          <PlusIcon data-icon="inline-start" />
          Agregar grupo
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modificar grupo" : "Agregar grupo"}</DialogTitle>
        </DialogHeader>

        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? 12000 : 4000}
        />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
        >
          <form.AppField name="codigo">
            {(field) => (
              <field.TextField label="Grupo" transform={toPeriodoLongTextInput} required maxLength={20} showCounter placeholder="" />
            )}
          </form.AppField>

          <Field variant="outlined">
            <FieldLabel htmlFor="grade-group-jornada">
              Jornada<span className="text-red"> *</span>
            </FieldLabel>
            <InputGroup className="h-11 rounded-md border border-input bg-muted/50 px-3">
              <InputGroupInput
                id="grade-group-jornada"
                readOnly
                disabled
                className="px-0"
                value={jornadaName}
                placeholder="Definida en el período académico"
              />
              <InputGroupAddon align="inline-end">
                <LockIcon className="size-4 text-muted-foreground" aria-label="Solo lectura" />
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <form.AppField name="cupo">
            {(field) => (
              <field.NumberField label="Cupo" required valueAs="number" maxDigits={2} placeholder="" />
            )}
          </form.AppField>

          <form.AppField
            name="directorId"
            listeners={{
              // Sin responsable la casilla no aplica (Regla 108).
              onChange: ({ value }) => {
                if (value == null) form.setFieldValue("dictaTodas", false)
              },
            }}
          >
            {(field) => (
              <field.SelectField
                label="Responsable de grupo"
                emptyValue={null}
                placeholder="Sin designar"
                clearable
                description={
                  academicPeriod
                    ? `Docentes de ${academicPeriod.sedeName}${jornadaName ? ` · ${jornadaName}` : ""}.`
                    : undefined
                }
                options={teachers.map((t) => ({ value: t.id, label: t.name }))}
              />
            )}
          </form.AppField>

          <form.AppField name="metodologia">
            {(field) => (
              <field.SelectField
                label="Metodología"
                required
                placeholder="Seleccione..."
                options={metodologiaOptions.map((o) => ({ value: o.key, label: o.label }))}
              />
            )}
          </form.AppField>

          <form.AppField name="dictaTodas">
            {(field) => (
              <div className="flex items-center sm:pt-3">
                <field.CheckboxField
                  label="El Responsable de grupo dicta todas las asignaturas del plan"
                  disabled={directorId == null}
                />
              </div>
            )}
          </form.AppField>
        </form>

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
            disabled={isSaving}
            aria-busy={isSaving}
          >
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

      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}
