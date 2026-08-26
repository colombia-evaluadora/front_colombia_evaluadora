import { useState } from "react"
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
import { PersonAddIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

import { useReingresarMatricula } from "@/features/coverage/api/mutations/reingresar-matricula"
import type { Matricula } from "@/features/coverage/api/types/matricula"

interface ReingresarMatriculaDialogProps {
  matricula: Matricula
  /** "icon" (fila de la tabla) o "button" (barra de detalle/edición). */
  trigger?: "icon" | "button"
}

export function ReingresarMatriculaDialog({
  matricula,
  trigger = "icon",
}: ReingresarMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  const fullName = `${matricula.firstName} ${matricula.lastName}`

  const reingresarMutation = useReingresarMatricula({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(`El estudiante ${fullName} quedó en estado cursando.`)
        setOpen(false)
      },
      onError: () => {
        toast.error("No se pudo reingresar al estudiante.")
      },
    },
  })

  // El estado de la matrícula solo cambia vía "Retirar"/"Reingreso" — este
  // botón únicamente tiene sentido cuando ya está retirado.
  if (matricula.status !== "retirado") return null

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          trigger === "button" ? (
            <Button
              type="button"
              variant="outline"
              color="primary"
              size="sm"
              aria-label={`Reingresar a ${fullName}`}
            />
          ) : (
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Reingresar a ${fullName}`}
            />
          )
        }
      >
        <PersonAddIcon data-icon={trigger === "button" ? "inline-start" : undefined} />
        {trigger === "button" && "Reingreso"}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmación de reingreso</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Está seguro de que desea reingresar al estudiante <strong>{fullName}</strong>?
          </AlertDialogDescription>
          <AlertDialogDescription>
            Al confirmar, el estudiante quedará en estado <strong>cursando</strong> y esta acción
            quedará registrada en su historial de matrícula.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="primary"
            disabled={reingresarMutation.isPending}
            aria-busy={reingresarMutation.isPending}
            onClick={() => reingresarMutation.mutate(matricula.id)}
          >
            {reingresarMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PersonAddIcon data-icon="inline-start" />
            )}
            Reingresar estudiante
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={reingresarMutation.isPending}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
