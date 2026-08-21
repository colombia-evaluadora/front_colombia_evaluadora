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
import { CATALOGS } from "@/lib/catalogs"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { useUser } from "@/lib/auth"

import { CampusDetailsForm } from "@/features/establishment/campuses/components/forms/form-campus-details"
import { useCreate } from "@/features/establishment/campuses/api/mutations/use-create"
import { useUpdate } from "@/features/establishment/campuses/api/mutations/use-update"
import { useCampusQuery } from "@/features/establishment/campuses/api/query/use-campus"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { CampusDraft } from "@/features/establishment/campuses/api/types/campus"
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
    establishmentId: null,
  }
}

/**
 * Solo los tres campos con asterisco (más el establecimiento, cuando el
 * selector está visible). El resto de la sede (barrio, comuna, dirección,
 * teléfono, resolución) es opcional, así que no entra al esquema.
 *
 * `requireEstablishment`: `FK_TESTABLECIMIENTO` es obligatorio en el alta
 * real, pero el selector solo se muestra para super admin — para el resto
 * de roles no lo validamos acá todavía (ver nota en `CampusDetailsForm`).
 */
function buildCampusSchema(requireEstablishment: boolean) {
  return z.object({
    name: z.string().trim().min(1, "Ingresa el nombre de la sede."),
    dane: z.string().trim().min(1, "Ingresa el código DANE antiguo de la sede."),
    // Mismo criterio que `requiredCatalogItem` en
    // `institution/utils/validate-form.ts`: `.nullish()` + chequear
    // `.id != null` en vez de `z.object({ id: z.number() }).nullable()` —
    // así un `{ id: undefined }` cae en el mensaje amigable en vez de
    // reventar con el error genérico de Zod por forma inválida.
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

  // Aviso local, propio del diálogo: mientras sigue abierto, cualquier
  // mensaje de esta pantalla pasa por acá y no por el `notify()` global —ese
  // queda para el aviso de "Guardar" que se ve en la página una vez que el
  // diálogo se cierra— o el mismo mensaje se veía duplicado (uno detrás del
  // overlay, otro acá).
  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)
  const noticeIdRef = useRef(0)

  function notifyInDialog(message: string, variant: NoticeVariant = "error") {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant })
  }

  const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
  const { data: user } = useUser()
  const isSuperAdmin = Boolean(user?.isSuperAdmin)
  // El selector de EE solo aplica al alta (FK_TESTABLECIMIENTO es inmutable
  // después de creada la sede) y solo para super admin — el resto de roles
  // crea sedes dentro de su propio EE (ver `CampusDetailsForm`).
  const showEstablishmentPicker = isSuperAdmin && !isEditMode
  const { data: establishments = [] } = useEstablishmentsOptionsQuery(showEstablishmentPicker)
  // Solo pedimos la sede cuando el diálogo está abierto en modo edición: al
  // vivir montado junto a la tabla, la query se dispararía en cada render.
  const campusQuery = useCampusQuery(campusId, isEditMode && open)

  // El formulario se resetea al abrir (alta) o cuando llega la sede a editar.
  useEffect(() => {
    if (!open) return

    if (!isEditMode) {
      setFormValues(createInitialCampusValues())
      setFieldErrors({})
      return
    }

    if (campusQuery.data?.status === "ok") {
      const campus = campusQuery.data.campus
      // En real, `zone` llega solo con el id (la query no resuelve contra
      // TLISTA_VALOR — ver use-campus.ts); se completa acá contra el
      // catálogo ya cargado. El EE no viaja en `Campus` (es inmutable, no
      // se pide en edición).
      const zone = campus.zone
        ? (zones.find((item) => item.id === campus.zone!.id) ?? campus.zone)
        : null
      setFormValues({ ...campus, zone, establishmentId: null })
      setFieldErrors({})
    }
  }, [campusQuery.data, isEditMode, open, zones])

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

  // Después de un intento de guardar fallido, cada cambio vuelve a validar
  // para que el mensaje/borde rojo de un campo desaparezca apenas se
  // completa, en vez de quedar pegado hasta el siguiente submit (antes
  // `fieldErrors` solo se recalculaba al enviar el form).
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
        values: { ...formValues, id: campusId },
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
        className="w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] overflow-y-auto overflow-x-hidden"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar sede" : "Agregar sede"}</DialogTitle>
        </DialogHeader>

        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? undefined : 4000}
          className="mb-2"
        />

        <form id="campus-form" onSubmit={handleSubmit}>
          <CampusDetailsForm
            value={formValues}
            onChange={handleFormChange}
            zones={zones}
            errors={fieldErrors}
            establishmentPicker={showEstablishmentPicker ? { establishments } : undefined}
          />
        </form>

        <DialogFooter className="justify-end gap-2">
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
