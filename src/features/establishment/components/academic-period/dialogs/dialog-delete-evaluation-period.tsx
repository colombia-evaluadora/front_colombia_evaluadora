import { useState } from "react"

import { SpinnerIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

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

import { useDeleteEvaluationPeriod } from "../../../api/mutations/delete-evaluation-period"
import type { EvaluationPeriod } from "../../../api/types/academic-period/evaluation-period"

interface DeleteEvaluationPeriodDialogProps {
  period: EvaluationPeriod
}

export function DeleteEvaluationPeriodDialog({
  period,
}: DeleteEvaluationPeriodDialogProps) {
  const [open, setOpen] = useState(false)

  const deleteMutation = useDeleteEvaluationPeriod({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setOpen(false)
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
            onClick={() => deleteMutation.mutate(period.codigo)}
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
