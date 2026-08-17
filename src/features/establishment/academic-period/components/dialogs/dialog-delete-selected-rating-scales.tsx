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

import { useDeleteRatingScalesBulk } from "@/features/establishment/academic-period/api/mutations/delete-rating-scales-bulk"
import {
  formatBulkDeleteError,
  summarizeBulkDelete,
} from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

interface DeleteSelectedRatingScalesDialogProps {
  academicPeriodId: number
  levelCount: number
  teachingLevelIds: number[]
  // El bulk delete falla por `teachingLevelId`, no por código de escala.
  namesById: Map<number, string>
  resetSelection: () => void
}

export function DeleteSelectedRatingScalesDialog({
  academicPeriodId,
  levelCount,
  teachingLevelIds,
  namesById,
  resetSelection,
}: DeleteSelectedRatingScalesDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const bulkDelete = useDeleteRatingScalesBulk()
  const { notify } = useNotify()
  const count = teachingLevelIds.length

  async function handleDelete() {
    setSubmitting(true)

    const result = await bulkDelete
      .mutateAsync({ academicPeriodId, teachingLevelIds })
      .catch(() => null)

    setSubmitting(false)

    if (!result) {
      notify("No se pudieron eliminar las escalas.", { variant: "error" })
    } else {
      const summary = summarizeBulkDelete(result)

      if (summary.failed.length === 0) {
        notify(SUCCESS_MESSAGES.ratingScale.deletedMany(summary.succeededCount))
      } else {
        notify(
          formatBulkDeleteError(
            summary,
            (n) => (n === 1 ? "la escala seleccionada" : `${n} escalas`),
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
      <AlertDialogTrigger
        render={
          <Button
            size="sm"
            color="destructive"
            aria-label={`Eliminar escalas de ${levelCount} nivel(es) seleccionado(s)`}
          />
        }
      >
        <CheckIcon data-icon="inline-start" />
        <span aria-hidden="true" className="md:hidden">
          ({levelCount})
        </span>
        <span className="sr-only md:not-sr-only">Eliminar ({levelCount})</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente la escala de valoración de {count} nivel(es)
            seleccionado(s). Esta acción no se puede deshacer.
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
