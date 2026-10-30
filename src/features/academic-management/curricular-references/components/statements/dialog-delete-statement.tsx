import { useState } from "react"

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useOfflineWritable } from "@/lib/offline/outbox/hooks"
import { QUEUED_MESSAGE } from "@/lib/offline/outbox/engine"

import { useDeleteStatement } from "@/features/academic-management/curricular-references/api/mutations/use-statement-mutations"
import type { CurricularStatement } from "@/features/academic-management/curricular-references/api/types/statement"

interface DeleteStatementDialogProps {
  statement: CurricularStatement
  levelLabel: string
  /** Rótulo de Nivel 2, para contar las evidencias que se van con él. */
  childLabel: string
  /** Texto del botón deshabilitado si ya se usó. */
  blockedMessage?: string
  onDeleted?: () => void
}

export function DeleteStatementDialog({ statement, levelLabel, childLabel, blockedMessage, onDeleted }: DeleteStatementDialogProps) {
  const [open, setOpen] = useState(false)
  // Sin red no se puede eliminar (plan offline §7.5).
  // Fase 4 offline: las escrituras de enunciados/evidencias se encolan en la outbox.
  const soloEnLinea = useOfflineWritable()
  const { notify } = useNotify()

  const deleteMutation = useDeleteStatement({
    mutationConfig: {
      onSuccess: (result) => {
        setOpen(false)
        notify(result?.queued ? QUEUED_MESSAGE : `${levelLabel} eliminado correctamente.`)
        onDeleted?.()
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  // Ya usado: no admite borrado físico; se retira inactivándolo (§2.1, Regla 10).
  if (statement.used && blockedMessage) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" onClick={(event) => event.stopPropagation()} />}>
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            disabled
            aria-label={`Eliminar ${levelLabel.toLowerCase()}`}
          >
            <TrashIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72">{blockedMessage}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  disabled={soloEnLinea.disabled}
                  aria-label={`Eliminar ${levelLabel.toLowerCase()}`}
                  onClick={(event) => event.stopPropagation()}
                />
              }
            />
          }
        >
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>{soloEnLinea.tooltip ?? `Eliminar ${levelLabel.toLowerCase()}`}</TooltipContent>
      </Tooltip>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {levelLabel.toLowerCase()}</AlertDialogTitle>
          <AlertDialogDescription className="break-words hyphens-auto" lang="es">
            Se eliminará permanentemente este {levelLabel.toLowerCase()}
            {statement.evidenceCount
              ? ` y ${statement.evidenceCount === 1 ? "su" : "sus"} ${statement.evidenceCount} ${childLabel.toLowerCase()}${statement.evidenceCount === 1 ? "" : "s"}`
              : ""}
            . Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending || soloEnLinea.disabled}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(statement.id)}
          >
            {deleteMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Eliminar
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={deleteMutation.isPending}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
