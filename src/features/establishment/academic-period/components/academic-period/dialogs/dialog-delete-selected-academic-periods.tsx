import { useState } from "react"

import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"
import { toast } from "sonner"

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

import { useDeleteAcademicPeriodsBulk } from "../../../api/mutations/academic-period/delete-academic-periods-bulk"

interface DeleteSelectedAcademicPeriodsDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function DeleteSelectedAcademicPeriodsDialog({
  selectedIds,
  resetSelection,
}: DeleteSelectedAcademicPeriodsDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const bulkDelete = useDeleteAcademicPeriodsBulk()
  const count = selectedIds.length

  async function handleDelete() {
    setSubmitting(true)
    const ids = selectedIds.map((id) => Number(id)).filter(Number.isFinite)
    // Una sola request atómica.
    const result = await bulkDelete
      .mutateAsync(ids)
      .catch(() => ({ status: "error" as const, message: "" }))
    setSubmitting(false)

    if (result.status === "error") {
      toast.error("No se pudieron eliminar los periodos seleccionados.")
    } else {
      toast.success(`${ids.length} periodo(s) eliminado(s).`)
    }
    setOpen(false)
    resetSelection()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            color="destructive"
            aria-label={`Eliminar ${count} periodo(s) seleccionado(s)`}
          />
        }
      >
        <TrashIcon data-icon="inline-start" />
        <span aria-hidden="true" className="md:hidden">
          ({count})
        </span>
        <span className="sr-only md:not-sr-only">Eliminar ({count})</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar los periodos seleccionados?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente {count} periodo(s) académico(s).
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting}
            aria-busy={submitting}
            onClick={handleDelete}
          >
            {submitting ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}