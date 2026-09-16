import { useEffect, useRef, useState, type SubmitEvent } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { CheckIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { getErrorMessage } from "@/lib/api-client"
import { CurricularReferenceDetailsForm } from "@/features/academic-management/curricular-references/components/forms/form-curricular-reference-details"
import { useCreate } from "@/features/academic-management/curricular-references/api/mutations/use-create"
import { useUpdate } from "@/features/academic-management/curricular-references/api/mutations/use-update"
import { useCurricularReferenceQuery } from "@/features/academic-management/curricular-references/api/query/use-curricular-reference"
import {
  useCurricularReferenceAreasQuery,
  type CurricularReferenceArea,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-reference-areas"
import { useSubjectLabelOptionsQuery } from "@/features/academic-management/curricular-references/api/query/use-subject-label-options"
import type { CurricularReferenceDraft } from "@/features/academic-management/curricular-references/api/types/curricular-reference"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"

interface ManageCurricularReferenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  curricularReferenceId?: number | null
  educationLevels: CatalogItem[]
  pedagogicalApproaches: CatalogItem[]
  evaluationTypes: CatalogItem[]
}

const EMPTY_AREAS: CurricularReferenceArea[] = []

function createInitialValues(): CurricularReferenceDraft {
  return {
    name: "",
    educationLevels: [],
    description: "",
    level1: "",
    level2: "",
    pedagogicalApproach: null,
    evaluationType: null,
    subjectLabel: null,
    areas: [],
    instrument: "",
    instrumentDescription: "",
    regulation: "",
    active: false,
  }
}

const curricularReferenceSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del referente."),
  educationLevels: z
    .array(z.object({ id: z.number() }))
    .min(1, "Selecciona al menos un nivel educativo."),
  description: z.string().trim().min(1, "Ingresa la descripción o finalidad."),
  level1: z.string().trim().min(1, "Ingresa el nivel 1."),
  level2: z.string().trim().min(1, "Ingresa el nivel 2."),
  pedagogicalApproach: z
    .object({ id: z.number().nullish() })
    .nullish()
    .refine((item) => item?.id != null, { message: "Selecciona el enfoque pedagógico." }),
  evaluationType: z
    .object({ id: z.number().nullish() })
    .nullish()
    .refine((item) => item?.id != null, { message: "Selecciona el tipo de evaluación." }),
  instrument: z.string().trim().min(1, "Ingresa el instrumento."),
  regulation: z.string().trim().min(1, "Ingresa la normatividad."),
})

function validateCurricularReference(values: CurricularReferenceDraft): Record<string, string> {
  const result = curricularReferenceSchema.safeParse(values)
  if (result.success) return {}

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    errors[issue.path.join(".")] ??= issue.message
  }
  return errors
}

export function ManageCurricularReferenceDialog({
  open,
  onOpenChange,
  curricularReferenceId = null,
  educationLevels,
  pedagogicalApproaches,
  evaluationTypes,
}: ManageCurricularReferenceDialogProps) {
  const { notify } = useNotify()
  const isEditMode = curricularReferenceId != null

  const { data: curricularReference, isPending: isDetailPending } = useCurricularReferenceQuery(
    curricularReferenceId ?? NaN,
  )

  const [formValues, setFormValues] = useState<CurricularReferenceDraft>(createInitialValues)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const initialValuesRef = useRef<CurricularReferenceDraft>(formValues)

  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)
  const noticeIdRef = useRef(0)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  function notifyInDialog(message: string, variant: NoticeVariant = "error") {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant })
  }
  const { data: referenceAreas = EMPTY_AREAS, isPending: isAreasPending } = useCurricularReferenceAreasQuery(
    curricularReferenceId ?? NaN,
  )
  const { data: subjectLabelOptions } = useSubjectLabelOptionsQuery()
  const populatedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      populatedRef.current = false
      setNotice(null)
      setConfirmDiscardOpen(false)
      return
    }
    if (populatedRef.current) return

    if (isEditMode) {
      if (!curricularReference || isAreasPending) return
      const {
        id: _id,
        createdYear: _createdYear,
        deactivatedYear: _deactivatedYear,
        ...rest
      } = curricularReference
      const resolvedAreas = referenceAreas.map((area) => ({
        id: area.tareaAsignaturaId,
        code: "",
        name: area.name,
      }))
      const values = { ...rest, areas: resolvedAreas }
      setFormValues(values)
      initialValuesRef.current = values
    } else {
      const initial = createInitialValues()
      setFormValues(initial)
      initialValuesRef.current = initial
    }
    setFieldErrors({})
    populatedRef.current = true
  }, [open, isEditMode, curricularReference, referenceAreas, isAreasPending])
  useEffect(() => {
    if (!open || isEditMode || !populatedRef.current) return
    if (formValues.subjectLabel != null) return
    const asignatura = subjectLabelOptions?.find((option) => option.name === "Asignatura")
    if (!asignatura) return
    const subjectLabel: CatalogItem = { id: asignatura.id, code: "", name: asignatura.name }
    setFormValues((prev) => ({ ...prev, subjectLabel }))
    initialValuesRef.current = { ...initialValuesRef.current, subjectLabel }
  }, [open, isEditMode, subjectLabelOptions, formValues.subjectLabel])

  const createMutation = useCreate({
    mutationConfig: {
      onError: (error) => {
        notifyInDialog(getErrorMessage(error) || "No fue posible guardar el referente curricular.")
      },
    },
  })

  const updateMutation = useUpdate({
    mutationConfig: {
      onError: (error) => {
        notifyInDialog(getErrorMessage(error) || "No fue posible actualizar el referente curricular.")
      },
    },
  })

  function handleFormChange(next: CurricularReferenceDraft) {
    setFormValues(next)
    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors(validateCurricularReference(next))
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateCurricularReference(formValues)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      notifyInDialog("Completa los campos obligatorios antes de guardar.")
      return
    }

    if (isEditMode && curricularReference) {
      const result = await updateMutation.mutateAsync({
        id: curricularReference.id,
        values: formValues,
        previousActive: curricularReference.active,
      })
      if (result.status === "error") {
        notifyInDialog(result.message ?? "No fue posible guardar el referente curricular.")
        return
      }

      notify("El referente curricular se actualizó correctamente.")
      onOpenChange(false)
      return
    }

    const result = await createMutation.mutateAsync(formValues)
    if (result.status === "error") {
      notifyInDialog(result.message ?? "No fue posible guardar el referente curricular.")
      return
    }

    notify("El referente curricular se creó correctamente.")
    onOpenChange(false)
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const isLoadingDetail = isEditMode && (isDetailPending || isAreasPending)

  const isDirty = JSON.stringify(formValues) !== JSON.stringify(initialValuesRef.current)
  const hasChanges = isEditMode ? isDirty : true
  const canSave = !isLoadingDetail && hasChanges

  function requestClose() {
    if (isPending) return
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose()
      }}
    >
      <DialogContent
        className="flex w-[min(95vw,48rem)] max-w-none sm:max-w-192 max-h-[85vh] flex-col overflow-hidden p-0"
        showCloseButton={false}
        inert={confirmDiscardOpen}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{isEditMode ? "Editar referente curricular" : "Agregar referente curricular"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Actualiza la información de este referente curricular."
              : "Completa la información para crear un nuevo referente curricular."}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6">
          <NoticeBanner
            notice={notice}
            onClose={() => setNotice(null)}
            variant={notice?.variant}
            autoCloseMs={notice?.variant === "error" ? undefined : 4000}
            className="mb-2"
          />

          {isLoadingDetail ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <form id="curricular-reference-form" onSubmit={handleSubmit}>
              <CurricularReferenceDetailsForm
                value={formValues}
                onChange={handleFormChange}
                educationLevels={educationLevels}
                pedagogicalApproaches={pedagogicalApproaches}
                evaluationTypes={evaluationTypes}
                errors={fieldErrors}
              />
            </form>
          )}
        </div>

        <DialogFooter className="shrink-0 justify-end gap-2 px-6 pb-6">
          {canSave && (
            <Button
              size="sm"
              type="submit"
              form="curricular-reference-form"
              variant="fill"
              color="primary"
              disabled={isPending}
            >
              <CheckIcon data-icon="inline-start" />
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          )}
          <Button
            size="sm"
            type="button"
            variant="fill"
            color="neutral"
            disabled={isPending}
            onClick={requestClose}
          >
            <XIcon data-icon="inline-start" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onOpenChange(false)
        }}
      />
    </Dialog>
  )
}
