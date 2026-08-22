import { useState } from "react"

import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
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
import { getErrorMessage } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"

import { useDeletePreMatricula } from "@/features/coverage/api/mutations/delete-pre-matricula"
import type { PreMatricula } from "@/features/coverage/api/types/pre-matricula"

interface DeletePreMatriculaDialogProps {
  preMatricula: PreMatricula
}

export function DeletePreMatriculaDialog({ preMatricula }: DeletePreMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const deleteMutation = useDeletePreMatricula({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Registro de prematrícula eliminado correctamente.")
        setOpen(false)
      },
      onError: (error) => {
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
            aria-label={`Eliminar registro de ${preMatricula.firstName} ${preMatricula.lastName}`}
          />
        }
      >
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente el registro de prematrícula de{" "}
            <strong>
              {preMatricula.firstName} {preMatricula.lastName}
            </strong>
            . Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(preMatricula.id)}
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
