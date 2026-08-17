import { useEffect, useState, type FormEvent } from "react"
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
import { useUser } from "@/lib/auth"

import { CampusDetailsForm } from "@/features/establishment/campuses/components/forms/form-campus-details"
import { useCreate } from "@/features/establishment/campuses/api/mutations/use-create"
import { useUpdate } from "@/features/establishment/campuses/api/mutations/use-update"
import { useCampusQuery } from "@/features/establishment/campuses/api/query/use-campus"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { CampusDraft } from "@/features/establishment/campuses/api/types/campus"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"

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
    zone: z.object({ id: z.number() }).nullable().refine((zone) => zone !== null, {
      message: "Selecciona la zona.",
    }),
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
          notify(result.message, { variant: "error" })
          return
        }

        notify(SUCCESS_MESSAGES.campus.created)
        onOpenChange(false)
      },
      onError: (error) => {
        notify(error.message || "No fue posible guardar la sede.", { variant: "error" })
      },
    },
  })

  const updateMutation = useUpdate({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }

        notify(SUCCESS_MESSAGES.campus.updated)
        onOpenChange(false)
      },
      onError: (error) => {
        notify(error.message || "No fue posible actualizar la sede.", { variant: "error" })
      },
    },
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateCampus(formValues, showEstablishmentPicker)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      notify("Completa los campos obligatorios antes de guardar.", { variant: "error" })
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
      <DialogContent className="w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar sede" : "Agregar sede"}</DialogTitle>
        </DialogHeader>

        <NoticeOutlet className="mb-2" />

        <form id="campus-form" onSubmit={handleSubmit}>
          <CampusDetailsForm
            value={formValues}
            onChange={setFormValues}
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
