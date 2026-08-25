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

import { useDeleteAcademicPeriodsBulk } from "@/features/establishment/academic-period/api/mutations/delete-academic-periods-bulk"
import {
  formatBulkDeleteError,
  summarizeBulkDelete,
} from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface DeleteSelectedAcademicPeriodsDialogProps {
  selectedIds: string[]
  // Nombre de cada periodo por id, para mostrarlo en el aviso de error en
  // vez del PK crudo — la tabla ya tiene esos nombres cargados.
  namesById: Map<number, string>
  resetSelection: () => void
}

export function DeleteSelectedAcademicPeriodsDialog({
  selectedIds,
  namesById,
  resetSelection,
}: DeleteSelectedAcademicPeriodsDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const bulkDelete = useDeleteAcademicPeriodsBulk()
  const { notify } = useNotify()
  const { puedeEliminar } = useMenuPermission("PERIODOS_ACADEMICOS")
  const count = selectedIds.length

  async function handleDelete() {
    setSubmitting(true)
    const ids = selectedIds.map((id) => Number(id)).filter(Number.isFinite)
    // Una sola request atómica a nivel HTTP, pero `fn_periodo_bulk_delete`
    // borra lo que puede y reporta el resto: cada fila trae su propio
    // `eliminado`/`error_mensaje`, no hay un único status para todo el lote.
    const result = await bulkDelete.mutateAsync(ids).catch(() => null)
    setSubmitting(false)

    if (!result) {
      notify("No se pudieron eliminar los periodos seleccionados.", {
        variant: "error",
      })
    } else {
      const summary = summarizeBulkDelete(result)

      if (summary.failed.length === 0) {
        notify(SUCCESS_MESSAGES.academicPeriod.deletedMany(summary.succeededCount))
      } else {
        notify(
          formatBulkDeleteError(
            summary,
            (n) => (n === 1 ? "el periodo académico seleccionado" : `${n} periodos académicos`),
            (id) => namesById.get(id),
          ),
          { variant: "error" },
        )
      }
    }
    setOpen(false)
    resetSelection()
  }

  if (!puedeEliminar) return null

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            size="sm"
            color="destructive"
            aria-label={`Eliminar ${count} periodo(s) seleccionado(s)`}
          />
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
