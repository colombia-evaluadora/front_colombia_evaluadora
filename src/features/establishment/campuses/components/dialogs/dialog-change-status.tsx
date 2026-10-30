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
import {
  CheckIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  ProhibitIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage, isConflictError } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useChangeCampusStatus } from "@/features/establishment/campuses/api/mutations/change-status"
import type { CampusStatus } from "@/features/establishment/campuses/api/types/campus"

interface ChangeCampusStatusDialogProps {
  campus: { id: number; name: string; status: CampusStatus }
}

/**
 * Inactivar / Activar (Regla 100). Inactivar pide confirmación; si la sede
 * tiene períodos en Inscripciones o Abiertos el backend responde 409 y el
 * mismo diálogo pasa a ser el bloqueo, con la lista y "Entendido".
 */
export function ChangeCampusStatusDialog({ campus }: ChangeCampusStatusDialogProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const inactivar = campus.status === "A"

  const mutation = useChangeCampusStatus({
    mutationConfig: {
      onSuccess: () => {
        notify(inactivar ? SUCCESS_MESSAGES.campus.deactivated! : SUCCESS_MESSAGES.campus.activated!)
        setOpen(false)
      },
      onError: (error) => {
        if (inactivar && isConflictError(error)) {
          setBlockedMessage(getErrorMessage(error))
          return
        }
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  function handleOpenChange(next: boolean) {
    if (mutation.isPending) return
    setOpen(next)
    if (!next) setBlockedMessage(null)
  }

  const label = inactivar ? "Inactivar" : "Activar"

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`${label} sede`} />}
            />
          }
        >
          {inactivar ? <PauseCircleIcon /> : <PlayCircleIcon />}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>

      <AlertDialogContent>
        {blockedMessage ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-start gap-2">
                <ProhibitIcon className="mt-0.5 size-6 shrink-0 text-red" aria-hidden />
                No se puede inactivar la sede {campus.name}
              </AlertDialogTitle>
              <AlertDialogDescription>{blockedMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel color="primary">
                <CheckIcon data-icon="inline-start" />
                Entendido
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {label} la sede {campus.name}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {inactivar
                  ? "La sede dejará de aparecer al crear períodos académicos, asignar roles y en los demás registros nuevos. Su información se conserva."
                  : "La sede volverá a aparecer al crear períodos académicos, asignar roles y en los demás registros nuevos."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" color="neutral" disabled={mutation.isPending}>
                <XIcon data-icon="inline-start" />
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                color={inactivar ? "destructive" : "primary"}
                disabled={mutation.isPending}
                aria-busy={mutation.isPending}
                onClick={(event) => {
                  // El diálogo se cierra al terminar, no al hacer clic: puede quedar como bloqueo.
                  event.preventDefault()
                  mutation.mutate({ campusId: campus.id, status: inactivar ? "I" : "A" })
                }}
              >
                {mutation.isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : inactivar ? (
                  <PauseCircleIcon data-icon="inline-start" />
                ) : (
                  <PlayCircleIcon data-icon="inline-start" />
                )}
                {label}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
