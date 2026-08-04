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

import { useDeleteGradeGroup } from "../../../api/mutations/grades/delete-grade-group"
import type { GradeGroup } from "../../../api/types/grade-group"

interface DeleteGradeGroupDialogProps {
  gradeGroup: GradeGroup
}

export function DeleteGradeGroupDialog({
  gradeGroup,
}: DeleteGradeGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const deleteMutation = useDeleteGradeGroup({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.gradeGroup.deleted)
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
        <span className="sr-only">Eliminar grupo</span>
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente el grupo {gradeGroup.codigo}. Esta
            acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(gradeGroup.codigo)}
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
