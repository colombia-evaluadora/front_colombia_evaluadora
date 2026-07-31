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

import { useDeleteAreaSubject } from "../../../api/mutations/area-subjects/delete-area-subject"

interface DeleteSelectedAreaSubjectsDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function DeleteSelectedAreaSubjectsDialog({
  selectedIds,
  resetSelection,
}: DeleteSelectedAreaSubjectsDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const deleteMutation = useDeleteAreaSubject()
  const count = selectedIds.length

  async function handleDelete() {
    setSubmitting(true)
    // Borrado en lote reusando el delete por área. Envolvemos cada uno para
    // que un fallo puntual no corte a los demás.
    const codigos = selectedIds.map((id) => Number(id)).filter(Number.isFinite)
    const results = await Promise.all(
      codigos.map((codigo) =>
        deleteMutation
          .mutateAsync(codigo)
          .catch(() => ({ status: "error" as const, message: "" }))
      )
    )
    setSubmitting(false)

    const failed = results.filter((result) => result.status === "error").length
    if (failed > 0) {
      toast.error(
        failed === codigos.length
          ? "No se pudieron eliminar las áreas seleccionadas."
          : `No se pudieron eliminar ${failed} de ${codigos.length} área(s).`
      )
    } else {
      toast.success(`${codigos.length} área(s) eliminada(s).`)
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
            aria-label={`Eliminar ${count} área(s) seleccionada(s)`}
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
            ¿Eliminar las áreas seleccionadas?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente {count} área(s) y todas sus
            asignaturas asociadas. Esta acción no se puede deshacer.
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