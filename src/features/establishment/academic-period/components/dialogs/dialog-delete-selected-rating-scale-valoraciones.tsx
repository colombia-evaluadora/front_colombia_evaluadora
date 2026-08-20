import { useState } from "react"

import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { useDeleteRatingScaleValoracionesBulk } from "@/features/establishment/academic-period/api/mutations/delete-rating-scale-valoraciones-bulk"
import {
  formatBulkDeleteError,
  summarizeBulkDelete,
} from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

interface DeleteSelectedRatingScaleValoracionesDialogProps {
  valoracionCount: number
  valoracionIds: number[]
  namesById: Map<number, string>
  resetSelection: () => void
}

export function DeleteSelectedRatingScaleValoracionesDialog({
  valoracionCount,
  valoracionIds,
  namesById,
  resetSelection,
}: DeleteSelectedRatingScaleValoracionesDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const bulkDelete = useDeleteRatingScaleValoracionesBulk()
  const { notify } = useNotify()

  async function handleDelete() {
    setSubmitting(true)

    const result = await bulkDelete.mutateAsync({ ids: valoracionIds }).catch(() => null)

    setSubmitting(false)

    if (!result) {
      notify("No se pudieron eliminar las valoraciones.", { variant: "error" })
    } else {
      const summary = summarizeBulkDelete(result)

      if (summary.failed.length === 0) {
        notify(
          summary.succeededCount === 1
            ? "La valoración se eliminó correctamente."
            : `Las ${summary.succeededCount} valoraciones se eliminaron correctamente.`,
        )
      } else {
        notify(
          formatBulkDeleteError(
            summary,
            (n) => (n === 1 ? "la valoración seleccionada" : `${n} valoraciones`),
            (id) => namesById.get(id),
          ),
          { variant: "error" },
        )
      }
    }

    setOpen(false)
    resetSelection()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {/* Mismo estilo que `ConfirmRemoveButton` (usado en la tabla de
          asignaturas del alta de área/asignatura): ícono de papelera solo,
          dentro del banner de selección — no un botón "Eliminar (n)"
          separado. */}
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
          />
        }
      >
        <span className="sr-only">
          Eliminar {valoracionCount} valoracion(es) seleccionada(s)
        </span>
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente {valoracionCount} valoracion(es) seleccionada(s). Esta
            acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={submitting}
            aria-busy={submitting}
            onClick={handleDelete}
          >
            {submitting ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={submitting}>
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
