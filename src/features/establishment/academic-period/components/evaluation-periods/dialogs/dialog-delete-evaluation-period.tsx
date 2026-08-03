import { useState } from "react"

import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"

import { useNotify } from "../../common/notice-context"
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

import { useDeleteEvaluationPeriod } from "../../../api/mutations/evaluation-periods/delete-evaluation-period"
import type { EvaluationPeriod } from "../../../api/types/evaluation-period"

interface DeleteEvaluationPeriodDialogProps {
  period: EvaluationPeriod
  academicPeriodId?: number
}

export function DeleteEvaluationPeriodDialog({
  period,
  academicPeriodId,
}: DeleteEvaluationPeriodDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const deleteMutation = useDeleteEvaluationPeriod({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        setOpen(false)
        notify("El periodo de evaluación se eliminó correctamente.")
      },
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="fill"
            color="destructive"
            size="icon"
            className="size-8"
          />
        }
      >
        <span className="sr-only">Eliminar periodo de evaluación</span>
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar este periodo de evaluación?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente el periodo {period.nombre}. Esta acción
            no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate({
                academicPeriodId,
                codigo: period.codigo,
              })
            }
          >
            {deleteMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
