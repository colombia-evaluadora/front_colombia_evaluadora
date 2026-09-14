import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"

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
import { deleteSubject } from "@/features/establishment/academic-period/api/mutations/delete-subject"
import {
  formatBulkDeleteError,
  summarizeBulkDelete,
} from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

interface DeleteSelectedStudyPlanItemsDialogProps {
  itemCount: number
  itemIds: number[]
  namesById: Map<number, string>
  asignaturaIdsById: Map<number, number>
  resetSelection: () => void
}

export function DeleteSelectedStudyPlanItemsDialog({
  itemCount,
  itemIds,
  namesById,
  asignaturaIdsById,
  resetSelection,
}: DeleteSelectedStudyPlanItemsDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const bulkDelete = useDeleteStudyPlanItemsBulk()
  const { notify } = useNotify()
  const queryClient = useQueryClient()

  function close() {
    setOpen(false)
    resetSelection()
  }

  async function handleQuitar() {
    setSubmitting(true)
    const result = await bulkDelete.mutateAsync({ ids: itemIds }).catch(() => null)
    setSubmitting(false)

    if (!result) {
      notify("No se pudieron quitar los renglones del plan de estudio.", { variant: "error" })
    } else {
      const summary = summarizeBulkDelete(result)
      if (summary.failed.length === 0) {
        notify(
          summary.succeededCount === 1
            ? "La asignatura se quitó del plan de estudio."
            : `Las ${summary.succeededCount} asignaturas se quitaron del plan de estudio.`,
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
    close()
  }

  async function handleEliminar() {
    setSubmitting(true)
    const result = await bulkDelete.mutateAsync({ ids: itemIds }).catch(() => null)

    if (!result) {
      setSubmitting(false)
      notify("No se pudieron eliminar los renglones del plan de estudio.", { variant: "error" })
      close()
      return
    }

    const summary = summarizeBulkDelete(result)
    const removedIds = result.rows.filter((row) => row.eliminado).map((row) => row.id)
    const hardDeleteResults = await Promise.allSettled(
      removedIds.map((codigo) => {
        const asignaturaId = asignaturaIdsById.get(codigo)
        return asignaturaId != null ? deleteSubject(asignaturaId) : Promise.reject()
      }),
    )
    const hardDeletedCount = hardDeleteResults.filter((r) => r.status === "fulfilled").length

    setSubmitting(false)

    if (hardDeletedCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subject-details"] })
      queryClient.invalidateQueries({ queryKey: ["study-plan-available"] })
    }

    const stillInUseCount = removedIds.length - hardDeletedCount

    if (summary.failed.length === 0) {
      const parts = [
        hardDeletedCount === removedIds.length
          ? `${hardDeletedCount === 1 ? "Se eliminó" : `Se eliminaron las ${hardDeletedCount}`} por completo.`
          : `Se ${removedIds.length === 1 ? "quitó" : "quitaron"} del plan; ${hardDeletedCount} se ${hardDeletedCount === 1 ? "eliminó" : "eliminaron"} por completo.`,
      ]
      if (stillInUseCount > 0) {
        parts.push(
          `${stillInUseCount} sigu${stillInUseCount === 1 ? "e" : "en"} en uso y no se pud${stillInUseCount === 1 ? "o" : "ieron"} eliminar del todo.`,
        )
      }
      notify(parts.join(" "), { variant: stillInUseCount > 0 ? "info" : "success" })
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
    close()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            size="sm"
            color="destructive"
            aria-label={`Eliminar ${itemCount} asignatura(s) seleccionada(s)`}
          />
        }
      >
        <TrashIcon data-icon="inline-start" />
        <span aria-hidden="true">Eliminar ({itemCount})</span>
      </AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogOverlay forceRender className="bg-black/30" />
      </AlertDialogPortal>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{itemCount} seleccionada(s)</AlertDialogTitle>
          <AlertDialogDescription>
            "Eliminar" las borra por completo (solo las que no estén en uso en otro lado).
            "Remover" solo las quita de este plan, conservándolas para reutilizarlas. Ninguna de
            las dos se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={submitting}
            aria-busy={submitting}
            onClick={handleEliminar}
          >
            {submitting ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Eliminar
          </AlertDialogAction>
          <AlertDialogAction
            color="primary"
            disabled={submitting}
            aria-busy={submitting}
            onClick={handleQuitar}
          >
            {submitting ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Remover
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={submitting}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
