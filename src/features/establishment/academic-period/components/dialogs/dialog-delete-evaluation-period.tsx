import { useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
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

import { useDeleteEvaluationPeriod } from "@/features/establishment/academic-period/api/mutations/delete-evaluation-period"
import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"

interface DeleteEvaluationPeriodDialogProps {
  period: EvaluationPeriod
}

export function DeleteEvaluationPeriodDialog({
  period,
}: DeleteEvaluationPeriodDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const deleteMutation = useDeleteEvaluationPeriod({
    mutationConfig: {
      onSuccess: () => {
        setOpen(false)
        notify(SUCCESS_MESSAGES.evaluationPeriod.deleted)
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
            <AlertDialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
          }
        >
          <span className="sr-only">Eliminar periodo de evaluación</span>
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>Eliminar periodo de evaluación</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente el periodo {period.nombre}. Esta acción no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate({
                id: period.id,
              })
            }
          >
            {deleteMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral">
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
