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
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { establishmentsRoute } from "@/router"

import { useDeleteEstablishment } from "../../api/mutations/delete-establishment"
import type { Establishment } from "../../api/types/establishment"
import { useNotify } from "@/components/notice/notice-context"

interface DeleteEstablishmentDialogProps {
  establishment: Establishment
}

export function DeleteEstablishmentDialog({
  establishment,
}: DeleteEstablishmentDialogProps) {
  const [open, setOpen] = useState(false)
  const navigate = establishmentsRoute.useNavigate()
  const { notify } = useNotify()

  const deleteMutation = useDeleteEstablishment({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }

        notify(SUCCESS_MESSAGES.establishment.deleted)
        setOpen(false)
        navigate({
          search: (prev) => ({
            ...prev,
            page: 0,
          }),
          replace: true,
        })
      },
      onError: (error) => {
        notify(error.message, { variant: "error" })
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
            aria-label={`Eliminar ${establishment.name}`}
          />
        }
      >
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente el establecimiento educativo{" "}
            {establishment.name}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(establishment.id)}
          >
            {deleteMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}