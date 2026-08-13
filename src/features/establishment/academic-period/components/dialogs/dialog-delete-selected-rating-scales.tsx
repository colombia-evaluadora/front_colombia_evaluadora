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

interface DeleteSelectedRatingScalesDialogProps {
  levelCount: number
  scaleCodigos: number[]
  resetSelection: () => void
}

export function DeleteSelectedRatingScalesDialog({
  levelCount,
  scaleCodigos,
  resetSelection,
}: DeleteSelectedRatingScalesDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const bulkDelete = useDeleteRatingScalesBulk()
  const { notify } = useNotify()
  const count = scaleCodigos.length

  async function handleDelete() {
    setSubmitting(true)
    // Una sola request atómica: el backend borra todas las escalas por código.
    const result = await bulkDelete
      .mutateAsync(scaleCodigos)
      .catch(() => ({ status: "error" as const, message: "" }))
    setSubmitting(false)

    if (result.status === "error") {
      notify("No se pudieron eliminar las escalas.", { variant: "error" })
    } else {
      notify(SUCCESS_MESSAGES.ratingScale.deletedMany(count))
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
            Se eliminarán permanentemente {count} escala(s) de valoración de {levelCount} nivel(es)
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
