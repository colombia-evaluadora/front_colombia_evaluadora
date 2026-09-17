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
import { PersonRemoveIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"

import { getErrorMessage } from "@/lib/api-client"
import { useRetireMatricula } from "@/features/coverage/api/mutations/retire-matricula"
import type { Matricula } from "@/features/coverage/api/types/matricula"

interface RetirarMatriculaDialogProps {
  matricula: Matricula
  /** "icon" (fila de la tabla) o "button" (barra de detalle/edición). */
  trigger?: "icon" | "button"
}

export function RetirarMatriculaDialog({ matricula, trigger = "icon" }: RetirarMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()
  const fullName = `${matricula.firstName} ${matricula.lastName}`

  const retireMutation = useRetireMatricula({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(`El estudiante ${fullName} quedó en estado retirado.`)
        setOpen(false)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  // El estado de la matrícula solo cambia vía "Retirar"/"Reingreso" — este
  // botón únicamente tiene sentido mientras el estudiante está cursando.
  if (matricula.status !== "Cursando") return null

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                trigger === "button" ? (
                  <Button type="button" variant="outline" color="primary" size="sm" aria-label={`Retirar a ${fullName}`} />
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    aria-label={`Retirar a ${fullName}`}
                  />
                )
              }
            />
          }
        >
          <PersonRemoveIcon data-icon={trigger === "button" ? "inline-start" : undefined} />
          {trigger === "button" && "Retirar"}
        </TooltipTrigger>
        <TooltipContent>{`Retirar a ${fullName}`}</TooltipContent>
      </Tooltip>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmación de retiro</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Está seguro de que desea retirar al estudiante <strong>{fullName}</strong>?
          </AlertDialogDescription>
          <AlertDialogDescription>
            Al confirmar, el estudiante quedará en estado <strong>retirado</strong> y esta acción
            quedará registrada en su historial de matrícula.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="primary"
            disabled={retireMutation.isPending}
            aria-busy={retireMutation.isPending}
            onClick={() => retireMutation.mutate(matricula.id)}
          >
            {retireMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PersonRemoveIcon data-icon="inline-start" />
            )}
            Retirar estudiante
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={retireMutation.isPending}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
