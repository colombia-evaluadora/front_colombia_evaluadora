import { useState } from "react"

import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"
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

  const fullName = [
    preMatricula.firstName,
    preMatricula.secondName,
    preMatricula.lastName,
    preMatricula.secondLastName,
  ]
    .filter(Boolean)
    .join(" ")

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
                  aria-label={`Eliminar registro de ${fullName}`}
                />
              }
            />
          }
        >
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>{`Eliminar registro de ${fullName}`}</TooltipContent>
      </Tooltip>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader className="sm:text-center">
          <AlertDialogTitle>
            ¿Deseas eliminar la Pre-Matricula de
            <br />
            {fullName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Una vez confirmes, esta acción no se podrá deshacer y la reserva quedará eliminada de
            forma definitiva.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            className="w-20"
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(preMatricula.id)}
          >
            {deleteMutation.isPending && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel
            className="w-20"
            variant="fill"
            color="neutral"
            disabled={deleteMutation.isPending}
          >
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
