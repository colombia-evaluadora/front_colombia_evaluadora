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
import { fetchCurricularReferenceImpact } from "@/features/academic-management/curricular-references/api/query/fetch-impact"
import {
  buildHighImpactAlerts,
  getChangedHighImpactFields,
  revertHighImpactFields,
  type HighImpactAlert,
  type HighImpactField,
} from "@/features/academic-management/curricular-references/api/high-impact-alerts"
import { HighImpactDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-high-impact"
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
    executionLabel: "",
    regulation: "",
    active: false,
  }
}

const curricularReferenceSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del referente.").max(150, "Máximo 150 caracteres."),
  educationLevels: z
    .array(z.object({ id: z.number() }))
    .min(1, "Selecciona al menos un nivel educativo."),
  description: z
    .string()
    .trim()
    .min(1, "Ingresa la descripción o finalidad.")
    .max(400, "Máximo 400 caracteres."),
  level1: z.string().trim().min(1, "Ingresa el rótulo de nivel 1.").max(50, "Máximo 50 caracteres."),
  level2: z.string().trim().min(1, "Ingresa el rótulo de nivel 2.").max(50, "Máximo 50 caracteres."),
  pedagogicalApproach: z
    .object({ id: z.number().nullish() })
    .nullish()
    .refine((item) => item?.id != null, { message: "Selecciona el enfoque pedagógico." }),
  evaluationType: z
    .object({ id: z.number().nullish() })
    .nullish()
    .refine((item) => item?.id != null, { message: "Selecciona el tipo de evaluación." }),
  instrument: z.string().trim().min(1, "Ingresa el rótulo de secuencia de actividades.").max(50, "Máximo 50 caracteres."),
  executionLabel: z.string().trim().max(50, "Máximo 50 caracteres."),
  regulation: z.string().trim().min(1, "Ingresa la normatividad.").max(400, "Máximo 400 caracteres."),
}).superRefine((values, ctx) => {
  const isFormativo = values.pedagogicalApproach?.id === 122
  const isCuantitativa = values.evaluationType?.id === 112
  if (isFormativo && isCuantitativa) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evaluationType"],
      message: "Los referentes de enfoque formativo requieren evaluación cualitativa.",
    })
  }
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

  // Modal de alto impacto (Reglas 4, 13, 14, 15).
  const [impactAlerts, setImpactAlerts] = useState<HighImpactAlert[]>([])
  const [impactFields, setImpactFields] = useState<HighImpactField[]>([])
  const [isCheckingImpact, setIsCheckingImpact] = useState(false)
  const isSubDialogOpen = confirmDiscardOpen || impactAlerts.length > 0

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
      setImpactAlerts([])
      setImpactFields([])
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

  // Los errores se manejan en `save` (ahí se detecta el de la Regla 7).
  const createMutation = useCreate()
  const updateMutation = useUpdate()

  function handleFormChange(next: CurricularReferenceDraft) {
    setFormValues(next)
    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors(validateCurricularReference(next))
    }
  }

  async function save(values: CurricularReferenceDraft) {
    try {
      const result =
        isEditMode && curricularReference
          ? await updateMutation.mutateAsync({
              id: curricularReference.id,
              values,
              previousActive: curricularReference.active,
            })
          : await createMutation.mutateAsync(values)

      if (result.status === "error") {
        setImpactAlerts([])
        notifyInDialog(result.message ?? "No fue posible guardar el referente curricular.")
        return
      }
    } catch (error) {
      // Se cierra el modal de impacto para que se vea el error del backend.
      setImpactAlerts([])
      notifyInDialog(getErrorMessage(error) || "No fue posible guardar el referente curricular.")
      return
    }

    setImpactAlerts([])
    notify(
      isEditMode
        ? "El referente curricular se actualizó correctamente."
        : "El referente curricular se creó correctamente.",
    )
    onOpenChange(false)
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateCurricularReference(formValues)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      notifyInDialog("Completa los campos obligatorios antes de guardar.")
      return
    }

    // Alto impacto: solo si el referente ya tiene unidades o actividades.
    if (isEditMode && curricularReference) {
      const fields = getChangedHighImpactFields(initialValuesRef.current, formValues)
      if (fields.length > 0) {
        setIsCheckingImpact(true)
        try {
          const impact = await fetchCurricularReferenceImpact(curricularReference.id)
          if (impact.units + impact.activities > 0) {
            setImpactFields(fields)
            setImpactAlerts(buildHighImpactAlerts(fields, formValues, impact))
            return
          }
        } catch (error) {
          notifyInDialog(getErrorMessage(error))
          return
        } finally {
          setIsCheckingImpact(false)
        }
      }
    }

    await save(formValues)
  }

  function cancelHighImpact() {
    // Cancelar revierte los campos y no guarda nada.
    setFormValues((prev) => revertHighImpactFields(prev, initialValuesRef.current, impactFields))
    setImpactAlerts([])
    setImpactFields([])
  }

  const isPending = createMutation.isPending || updateMutation.isPending || isCheckingImpact
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
        inert={isSubDialogOpen}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{isEditMode ? "Editar referente curricular" : "Agregar referente curricular"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Actualiza la información de este referente curricular."
              : "Completa la información para crear un nuevo referente curricular."}
          </DialogDescription>
          {/* Fijo con el título: no se pierde al hacer scroll en el formulario. */}
          <NoticeBanner
            notice={notice}
            onClose={() => setNotice(null)}
            variant={notice?.variant}
            autoCloseMs={notice?.variant === "error" ? undefined : 4000}
            className="mt-2"
          />
        </DialogHeader>

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6">

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

      <HighImpactDialog
        open={impactAlerts.length > 0}
        alerts={impactAlerts}
        isPending={isPending}
        onConfirm={() => save(formValues)}
        onCancel={cancelHighImpact}
      />

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
