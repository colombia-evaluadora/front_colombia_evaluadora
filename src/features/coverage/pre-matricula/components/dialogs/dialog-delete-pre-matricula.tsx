import { useState } from "react"

import { SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
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

import { useDeletePreMatricula } from "@/features/coverage/pre-matricula/api/mutations/delete-pre-matricula"
import type { PreMatricula } from "@/features/coverage/pre-matricula/api/types/pre-matricula"

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
                  color="destructive"
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
            ¿Deseas eliminar la pre-matrícula de
            <br />
            {fullName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Una vez confirmes, esta acción no se podrá deshacer y la reserva quedará eliminada de
            forma definitiva.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel variant="outline" color="neutral"
            className="w-20"
            disabled={deleteMutation.isPending}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
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
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
