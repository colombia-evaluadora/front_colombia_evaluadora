import { useState } from "react"

import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"

import { useNotify } from "../../common/notice-context"
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

import { useDeleteEvaluationPeriodsBulk } from "../../../api/mutations/evaluation-periods/delete-evaluation-periods-bulk"

interface DeleteSelectedEvaluationPeriodsDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function DeleteSelectedEvaluationPeriodsDialog({
  selectedIds,
  resetSelection,
}: DeleteSelectedEvaluationPeriodsDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const bulkDelete = useDeleteEvaluationPeriodsBulk()
  const { notify } = useNotify()
  const count = selectedIds.length

  async function handleDelete() {
    setSubmitting(true)
    const codigos = selectedIds
      .map((id) => Number(id))
      .filter(Number.isFinite)
    const result = await bulkDelete
      .mutateAsync(codigos)
      .catch(() => ({ status: "error" as const, message: "" }))
    setSubmitting(false)

    if (result.status === "error") {
      notify("No se pudieron eliminar los periodos de evaluación seleccionados.", {
        variant: "error",
      })
    } else {
      notify(`Se eliminaron ${codigos.length} periodo(s) de evaluación correctamente.`)
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
            aria-label={`Eliminar ${count} periodo(s) de evaluación seleccionado(s)`}
          />
        }
      >
        <TrashIcon data-icon="inline-start" />
        <span aria-hidden="true">Eliminar ({count})</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente {count} periodo(s) de evaluación.
            Esta acción no se puede deshacer.
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
