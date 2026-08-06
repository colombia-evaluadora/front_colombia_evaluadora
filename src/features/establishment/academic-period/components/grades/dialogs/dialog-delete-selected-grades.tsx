import { useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"

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

import { useDeleteGradesBulk } from "../../../api/mutations/grades/delete-grades-bulk"

interface DeleteSelectedGradesDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function DeleteSelectedGradesDialog({
  selectedIds,
  resetSelection,
}: DeleteSelectedGradesDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const bulkDelete = useDeleteGradesBulk()
  const { notify } = useNotify()
  const count = selectedIds.length

  async function handleDelete() {
    setSubmitting(true)
    const ids = selectedIds.map((id) => Number(id)).filter(Number.isFinite)
    const result = await bulkDelete
      .mutateAsync(ids)
      .catch(() => ({ status: "error" as const, message: "" }))
    setSubmitting(false)

    if (result.status === "error") {
      notify("No se pudieron eliminar los grados seleccionados.", {
        variant: "error",
      })
    } else {
      notify(SUCCESS_MESSAGES.grade.deletedMany(ids.length))
    }
    setOpen(false)
    resetSelection()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button color="destructive" aria-label={`Eliminar ${count} grado(s) seleccionado(s)`} />
        }
      >
        <TrashIcon data-icon="inline-start" />
        <span aria-hidden="true">Eliminar ({count})</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente {count} grado(s). Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            color="destructive"
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
