import { useState } from "react"
import { toast } from "sonner"

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

import { useDeleteMatricula } from "@/features/coverage/api/mutations/delete-matricula"
import type { Matricula } from "@/features/coverage/api/types/matricula"

interface DeleteMatriculaDialogProps {
  matricula: Matricula
  /** "icon" (fila de la tabla) o "button" (barra de detalle/edición). */
  trigger?: "icon" | "button"
  /** Además del toast, la página de detalle necesita volver al listado. */
  onDeleted?: () => void
}

export function DeleteMatriculaDialog({
  matricula,
  trigger = "icon",
  onDeleted,
}: DeleteMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  const fullName = `${matricula.firstName} ${matricula.lastName}`

  const deleteMutation = useDeleteMatricula({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success("Estudiante eliminado correctamente.")
        setOpen(false)
        onDeleted?.()
      },
      onError: () => {
        toast.error("No se pudo eliminar el estudiante.")
      },
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          trigger === "button" ? (
            <Button type="button" variant="outline" color="destructive" size="icon-sm" aria-label={`Eliminar ${fullName}`} />
          ) : (
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Eliminar ${fullName}`}
            />
          )
        }
      >
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente la matrícula de {fullName}. Esta acción no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(matricula.id)}
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
