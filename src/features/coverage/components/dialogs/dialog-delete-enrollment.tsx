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

import { useDeleteEnrollment } from "@/features/coverage/api/mutations/delete-enrollment"
import type { Enrollment } from "@/features/coverage/api/types/enrollment"

interface DeleteEnrollmentDialogProps {
  enrollment: Enrollment
}

export function DeleteEnrollmentDialog({ enrollment }: DeleteEnrollmentDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const fullName = [
    enrollment.firstName,
    enrollment.secondName,
    enrollment.lastName,
    enrollment.secondLastName,
  ]
    .filter(Boolean)
    .join(" ")

  const deleteMutation = useDeleteEnrollment({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Inscripción eliminada correctamente.")
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
                  aria-label={`Eliminar inscripción de ${fullName}`}
                />
              }
            />
          }
        >
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>{`Eliminar inscripción de ${fullName}`}</TooltipContent>
      </Tooltip>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader className="sm:text-center">
          <AlertDialogTitle>
            ¿Deseas eliminar la inscripción de
            <br />
            {fullName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Una vez confirmes, esta acción no se podrá deshacer y el registro quedará eliminado de
            forma definitiva.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            className="w-20"
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(enrollment.id)}
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
