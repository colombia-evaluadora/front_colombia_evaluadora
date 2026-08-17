import { useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

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

import { useDeleteEvaluationPeriodsBulk } from "@/features/establishment/academic-period/api/mutations/delete-evaluation-periods-bulk"
import {
  formatBulkDeleteError,
  summarizeBulkDelete,
} from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

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
    const codigos = selectedIds.map((id) => Number(id)).filter(Number.isFinite)
    const result = await bulkDelete.mutateAsync(codigos).catch(() => null)
    setSubmitting(false)

    if (!result) {
      notify("No se pudieron eliminar los periodos de evaluación seleccionados.", {
        variant: "error",
      })
    } else {
      const summary = summarizeBulkDelete(result)

      if (summary.failed.length === 0) {
        notify(SUCCESS_MESSAGES.evaluationPeriod.deletedMany(summary.succeededCount))
      } else {
        notify(
          formatBulkDeleteError(summary, (n) =>
            n === 1
              ? "el periodo de evaluación seleccionado"
              : `${n} periodos de evaluación`,
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
      <AlertDialogTrigger
        render={
          <Button
            size="sm"
            color="destructive"
            aria-label={`Eliminar ${count} periodo(s) de evaluación seleccionado(s)`}
          />
        }
      >
        <CheckIcon data-icon="inline-start" />
        <span aria-hidden="true">Eliminar ({count})</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente {count} periodo(s) de evaluación. Esta acción no se puede
            deshacer.
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
