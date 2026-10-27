import { useEffect, useRef, useState, type FormEvent } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { CheckIcon, XIcon } from "@/components/ui/icons"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { CampusDetailsForm } from "@/features/establishment/campuses/components/forms/form-campus-details"
import { useCreate } from "@/features/establishment/campuses/api/mutations/use-create"
import { useUpdate } from "@/features/establishment/campuses/api/mutations/use-update"
import { useCampusQuery } from "@/features/establishment/campuses/api/query/use-campus"
import { useZonasSedeQuery } from "@/features/establishment/campuses/api/query/use-zonas-sede"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import type { CampusDraft } from "@/features/establishment/campuses/api/types/campus"
import {
  validarDireccion,
  validarLugar,
  validarNombreEstablecimiento,
  validarUbicacion,
} from "@/features/establishment/shared/text-field-rules"
import { MENSAJES, TELEFONO } from "@/features/establishment/shared/person-field-rules"
import { useNotify } from "@/components/notice/notice-context"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"

interface ManageCampusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // `null`/ausente = alta; con id = edición de esa sede.
  campusId?: number | null
}

function createInitialCampusValues(): CampusDraft {
  return {
    name: "",
    dane: "",
    zone: null,
    neighborhood: "",
    commune: "",
    address: "",
    phone: "",
    locality: "",
    georeference: "",
    establishmentId: null,
  }
}

/** Campo opcional validado por una regla de `text-field-rules` (mensaje o `null`). */
function regla(check: (value: string) => string | null) {
  return z.string().nullish().superRefine((value, ctx) => {
    const message = check(value ?? "")
    if (message) ctx.addIssue({ code: "custom", message })
  })
}

function buildCampusSchema(requireEstablishment: boolean) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, "Ingresa el nombre de la sede.")
      .superRefine((value, ctx) => {
        const message = validarNombreEstablecimiento(value)
        if (message) ctx.addIssue({ code: "custom", message })
      }),
    locality: regla((v) => validarLugar(v, "La localidad")),
    commune: regla((v) => validarLugar(v, "La comuna")),
    neighborhood: regla((v) => validarLugar(v, "El barrio")),
    address: regla(validarDireccion),
    phone: regla((v) => (v.trim() && !TELEFONO.test(v.trim()) ? MENSAJES.telefono : null)),
    georeference: regla(validarUbicacion),
    dane: z.string().trim().min(1, "Ingresa el código DANE antiguo de la sede."),
    // `.nullish()` + refine: un `{ id: undefined }` da el mensaje amigable.
    zone: z
      .object({ id: z.number().nullish() })
      .nullish()
      .refine((zone) => zone?.id != null, { message: "Selecciona la zona." }),
    establishmentId: requireEstablishment
      ? z.number({ message: "Selecciona el establecimiento educativo." })
      : z.number().nullable(),
  })
}

/** Un mensaje por campo, indexado por su ruta dentro de `Campus`. */
function validateCampus(values: CampusDraft, requireEstablishment: boolean): Record<string, string> {
  const result = buildCampusSchema(requireEstablishment).safeParse(values)

  if (result.success) {
    return {}
  }

  const errors: Record<string, string> = {}

  for (const issue of result.error.issues) {
    errors[issue.path.join(".")] ??= issue.message
  }

  return errors
}

export function ManageCampusDialog({
  open,
  onOpenChange,
  campusId = null,
}: ManageCampusDialogProps) {
  const { notify } = useNotify()
  const isEditMode = campusId !== null

  const [formValues, setFormValues] = useState<CampusDraft>(createInitialCampusValues)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Aviso local del diálogo; el `notify()` de página queda para el éxito.
  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)
  const noticeIdRef = useRef(0)

  function notifyInDialog(message: string, variant: NoticeVariant = "error") {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant })
  }

  // El EE se elige solo en el alta (es inmutable); se muestra para todo rol.
  const showEstablishmentPicker = !isEditMode
  const { data: establishments = [] } = useEstablishmentsOptionsQuery(showEstablishmentPicker)
  // Solo en edición y abierto: el diálogo vive montado.
  const campusQuery = useCampusQuery(campusId, isEditMode && open)

  // Zonas válidas según el EE (V414): del selector en alta, de la sede en edición.
  const zonesEstablishmentId = isEditMode
    ? (campusQuery.data?.status === "ok" ? (campusQuery.data.campus.establishmentId ?? null) : null)
    : formValues.establishmentId
  const { data: zones = [] } = useZonasSedeQuery(zonesEstablishmentId)

  // El formulario se resetea al abrir (alta) o cuando llega la sede a editar.
  useEffect(() => {
    // El diálogo vive montado: sin esto el aviso reaparecía al reabrirlo.
    if (!open) {
      setNotice(null)
      return
    }

    if (!isEditMode) {
      setFormValues(createInitialCampusValues())
      setFieldErrors({})
      return
    }

    if (campusQuery.data?.status === "ok") {
      const campus = campusQuery.data.campus
      // `zone` llega solo con id; la completa el efecto de `zones`.
      setFormValues({ ...campus, zone: campus.zone, establishmentId: null })
      setFieldErrors({})
    }
    // `zones` no va en deps: resetearía el form al cambiar de EE.
  }, [campusQuery.data, isEditMode, open])

  // Limpia la zona si ya no es válida o la completa con el ítem del catálogo.
  useEffect(() => {
    if (zones.length === 0) return

    setFormValues((current) => {
      if (!current.zone) return current
      const enCatalogo = zones.find((item) => item.id === current.zone!.id)
      if (!enCatalogo) return { ...current, zone: null }
      return enCatalogo.name === current.zone.name ? current : { ...current, zone: enCatalogo }
    })
  }, [zones])

  const createMutation = useCreate({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notifyInDialog(result.message)
          return
        }

        notify(SUCCESS_MESSAGES.campus.created)
        onOpenChange(false)
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error) || "No fue posible guardar la sede.")
      },
    },
  })

  const updateMutation = useUpdate({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notifyInDialog(result.message)
          return
        }

        notify(SUCCESS_MESSAGES.campus.updated)
        onOpenChange(false)
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error) || "No fue posible actualizar la sede.")
      },
    },
  })

  // Tras un submit fallido, revalida en cada cambio.
  function handleFormChange(next: CampusDraft) {
    setFormValues(next)

    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors(validateCampus(next, showEstablishmentPicker))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateCampus(formValues, showEstablishmentPicker)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      notifyInDialog("Completa los campos obligatorios antes de guardar.")
      return
    }

    if (isEditMode && campusId) {
      await updateMutation.mutateAsync({
        campusId,
        values: { ...formValues, id: campusId, establishmentId: formValues.establishmentId ?? undefined },
      })
      return
    }

    await createMutation.mutateAsync(formValues)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Mientras guarda no dejamos cerrar por click afuera o Escape.
        if (!isPending) onOpenChange(next)
      }}
    >
      <DialogContent
        className="flex w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] flex-col overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{isEditMode ? "Editar sede" : "Agregar sede"}</DialogTitle>
        </DialogHeader>

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6">
          <NoticeBanner
            notice={notice}
            onClose={() => setNotice(null)}
            variant={notice?.variant}
            // Mismo tiempo que el error del `notify()` global; antes quedaba fijo.
            autoCloseMs={notice?.variant === "error" ? 12000 : 4000}
            className="mb-2"
          />

          <form id="campus-form" onSubmit={handleSubmit}>
            <CampusDetailsForm
              value={formValues}
              onChange={handleFormChange}
              zones={zones}
              errors={fieldErrors}
              establishmentPicker={showEstablishmentPicker ? { establishments } : undefined}
              info={isEditMode && campusQuery.data?.status === "ok" ? campusQuery.data.info : undefined}
            />
          </form>
        </div>

        <DialogFooter className="shrink-0 justify-end gap-2 px-6 pb-6">
          <Button
            size="sm"
            type="submit"
            form="campus-form"
            variant="fill"
            color="primary"
            disabled={isPending}
          >
            <CheckIcon data-icon="inline-start" />
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            size="sm"
            type="button"
            variant="fill"
            color="neutral"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
