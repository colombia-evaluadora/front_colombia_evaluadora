import { useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"

import { useNotify } from "@/components/notice/notice-context"
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

import { useDeleteAreaSubject } from "../../../api/mutations/area-subjects/delete-area-subject"
import type { AreaSubject } from "../../../api/types/area-subject"

interface DeleteAreaSubjectDialogProps {
  areaSubject: AreaSubject
}

export function DeleteAreaSubjectDialog({ areaSubject }: DeleteAreaSubjectDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const deleteMutation = useDeleteAreaSubject({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        setOpen(false)
        notify(SUCCESS_MESSAGES.areaSubject.deleted)
      },
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="ghost" color="neutral" size="icon" className="size-8" />}
      >
        <span className="sr-only">Eliminar área/asignatura</span>
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente {areaSubject.nombreInterno}. Esta acción no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(areaSubject.codigo)}
          >
            {/* El spinner reemplaza al icono en vez de sumarse: así el ancho
                del botón no salta al entrar en loading. */}
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
