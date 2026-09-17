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
import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useDeleteStatement } from "@/features/academic-management/curricular-references/api/mutations/use-statement-mutations"
import type { CurricularStatement } from "@/features/academic-management/curricular-references/api/types/statement"

interface DeleteStatementDialogProps {
  statement: CurricularStatement
  levelLabel: string
  onDeleted?: () => void
}

export function DeleteStatementDialog({ statement, levelLabel, onDeleted }: DeleteStatementDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const deleteMutation = useDeleteStatement({
    mutationConfig: {
      onSuccess: () => {
        setOpen(false)
        notify(`${levelLabel} eliminado correctamente.`)
        onDeleted?.()
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

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
                  aria-label={`Eliminar ${levelLabel.toLowerCase()}`}
                  onClick={(event) => event.stopPropagation()}
                />
              }
            />
          }
        >
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>{`Eliminar ${levelLabel.toLowerCase()}`}</TooltipContent>
      </Tooltip>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription className="break-words hyphens-auto" lang="es">
            Se eliminará permanentemente este {levelLabel.toLowerCase()} y sus evidencias asociadas. Esta
            acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(statement.id)}
          >
            {deleteMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={deleteMutation.isPending}>
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
