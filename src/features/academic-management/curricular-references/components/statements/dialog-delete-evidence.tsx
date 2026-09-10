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
import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useDeleteEvidence } from "@/features/academic-management/curricular-references/api/mutations/use-statement-mutations"
import type { CurricularEvidence } from "@/features/academic-management/curricular-references/api/types/statement"

interface DeleteEvidenceDialogProps {
  evidence: CurricularEvidence
  levelLabel: string
}

export function DeleteEvidenceDialog({ evidence, levelLabel }: DeleteEvidenceDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const deleteMutation = useDeleteEvidence({
    mutationConfig: {
      onSuccess: () => {
        setOpen(false)
        notify(`${levelLabel} eliminada correctamente.`)
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
      >
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription className="break-words hyphens-auto" lang="es">
            Se eliminará permanentemente esta {levelLabel.toLowerCase()}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(evidence.id)}
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
