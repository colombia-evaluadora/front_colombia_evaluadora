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
  const { notify } = useNotify()
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
      notify("No se pudieron eliminar los periodos seleccionados.", {
        variant: "error",
      })
    } else {
      notify(SUCCESS_MESSAGES.academicPeriod.deletedMany(ids.length))
    }
    setOpen(false)
    resetSelection()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button color="destructive" aria-label={`Eliminar ${count} periodo(s) seleccionado(s)`} />
        }
      >
        <CheckIcon data-icon="inline-start" />
        <span aria-hidden="true" className="md:hidden">
          ({count})
        </span>
        <span className="sr-only md:not-sr-only">Eliminar ({count})</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán permanentemente {count} periodo(s) académico(s). Esta acción no se puede
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
