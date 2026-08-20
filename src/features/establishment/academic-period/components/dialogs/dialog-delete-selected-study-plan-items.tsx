import { useState } from "react"

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
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { useDeleteStudyPlanItemsBulk } from "@/features/establishment/academic-period/api/mutations/delete-study-plan-items-bulk"
import {
  formatBulkDeleteError,
  summarizeBulkDelete,
} from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

interface DeleteSelectedStudyPlanItemsDialogProps {
  itemCount: number
  itemIds: number[]
  namesById: Map<number, string>
  resetSelection: () => void
}

export function DeleteSelectedStudyPlanItemsDialog({
  itemCount,
  itemIds,
  namesById,
  resetSelection,
}: DeleteSelectedStudyPlanItemsDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const bulkDelete = useDeleteStudyPlanItemsBulk()
  const { notify } = useNotify()

  async function handleDelete() {
    setSubmitting(true)

    const result = await bulkDelete.mutateAsync({ ids: itemIds }).catch(() => null)

    setSubmitting(false)

    if (!result) {
      notify("No se pudieron eliminar los renglones del plan de estudio.", { variant: "error" })
    } else {
      const summary = summarizeBulkDelete(result)

      if (summary.failed.length === 0) {
        notify(
          summary.succeededCount === 1
            ? "La asignatura se quitó del plan de estudio correctamente."
            : `Las ${summary.succeededCount} asignaturas se quitaron del plan de estudio correctamente.`,
        )
      } else {
        notify(
          formatBulkDeleteError(
            summary,
            (n) => (n === 1 ? "la asignatura seleccionada" : `${n} asignaturas`),
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
      {/* Mismo estilo que la tabla de grados (`DeleteSelectedGradesDialog`):
          botón rojo "Eliminar (n)". */}
      <AlertDialogTrigger
        render={
          <Button
            size="sm"
            color="destructive"
            aria-label={`Eliminar ${itemCount} asignatura(s) seleccionada(s)`}
          />
        }
      >
        <CheckIcon data-icon="inline-start" />
        <span aria-hidden="true">Eliminar ({itemCount})</span>
      </AlertDialogTrigger>
      {/* `forceRender`: este AlertDialog se abre anidado dentro del Dialog de
          crear/editar grado (ya abierto) — sin forzar su propio overlay, no
          bloquea el fondo (mismo fix que dialog-select-general-area.tsx). */}
      <AlertDialogPortal>
        <AlertDialogOverlay forceRender className="bg-black/30" />
      </AlertDialogPortal>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se quitarán del plan de estudio {itemCount} asignatura(s) seleccionada(s). Esta acción
            no se puede deshacer.
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
