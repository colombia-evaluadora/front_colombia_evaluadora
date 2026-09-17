import { useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

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

import { useDeleteAcademicPeriod } from "@/features/establishment/academic-period/api/mutations/delete-academic-period"
import type { AcademicPeriod } from "@/features/establishment/academic-period/api/types/academic-period"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface DeleteAcademicPeriodDialogProps {
  period: AcademicPeriod
}

export function DeleteAcademicPeriodDialog({ period }: DeleteAcademicPeriodDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()
  const { puedeEliminar } = useMenuPermission("PERIODOS_ACADEMICOS")

  const deleteMutation = useDeleteAcademicPeriod({
    mutationConfig: {
      onSuccess: (result) => {
        setOpen(false)
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.academicPeriod.deleted)
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  if (!puedeEliminar) return null

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
          }
        >
          <span className="sr-only">Eliminar periodo</span>
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>Eliminar periodo</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente el periodo {period.name}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(period.id)}
          >
            {/* El spinner reemplaza al icono en vez de sumarse: así el ancho
                del botón no salta al entrar en loading. */}
            {deleteMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral">
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
