import { useEffect, useState, type FormEvent } from "react"

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

import { CampusDetailsForm } from "../forms/form-campus-details"
import { useCreateCampus } from "../../api/mutations/use-create-campus"
import { useUpdateCampus } from "../../api/mutations/use-update-campus"
import { useCampusQuery } from "../../api/query/use-campus-query"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import type { CatalogItem } from "../../api/types/catalog"
import type { Campus } from "../../api/types/campus"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"

interface ManageCampusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // `null`/ausente = alta; con id = edición de esa sede.
  campusId?: string | null
}

function createEmptyCatalogItem(): CatalogItem {
  return { id: "", code: "", name: "" }
}

function createInitialCampusValues(): Campus {
  return {
    id: crypto.randomUUID(),
    name: "",
    dane: "",
    zone: createEmptyCatalogItem(),
    neighborhood: "",
    commune: "",
    address: "",
    phone: "",
    approvalResolution: "",
  }
}

function validateCampus(values: Campus): string[] {
  const errors: string[] = []

  if (!values.name.trim()) {
    errors.push("El nombre de la sede es obligatorio.")
  }

  if (!values.dane.trim()) {
    errors.push("El código DANE es obligatorio.")
  }

  if (!values.zone.id.trim()) {
    errors.push("La zona es obligatoria.")
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

  const [formValues, setFormValues] = useState<Campus>(createInitialCampusValues)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
  // Solo pedimos la sede cuando el diálogo está abierto en modo edición: al
  // vivir montado junto a la tabla, la query se dispararía en cada render.
  const campusQuery = useCampusQuery(campusId, isEditMode && open)

  // El formulario se resetea al abrir (alta) o cuando llega la sede a editar.
  useEffect(() => {
    if (!open) return

    if (!isEditMode) {
      setFormValues(createInitialCampusValues())
      setValidationErrors([])
      return
    }

    if (campusQuery.data?.status === "ok") {
      setFormValues(campusQuery.data.campus)
      setValidationErrors([])
    }
  }, [campusQuery.data, isEditMode, open])

  const createMutation = useCreateCampus({
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

  const updateMutation = useUpdateCampus({
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

    const errors = validateCampus(formValues)
    setValidationErrors(errors)

    if (errors.length > 0) {
      notify("Completa los campos obligatorios antes de guardar.", { variant: "error" })
      return
    }

    if (isEditMode && campusId) {
      await updateMutation.mutateAsync({
        campusId,
        values: formValues,
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
      <DialogContent className="w-[min(98vw,64rem)] max-w-none sm:max-w-256 max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar sede" : "Agregar sede"}</DialogTitle>
        </DialogHeader>

        <NoticeOutlet className="mb-2" />

        {validationErrors.length > 0 ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">Completa los campos obligatorios:</p>
            <ul className="mt-2 list-disc pl-5">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form id="campus-form" onSubmit={handleSubmit}>
          <CampusDetailsForm value={formValues} onChange={setFormValues} zones={zones} />
        </form>

        <DialogFooter className="justify-end gap-2">
          <Button
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
