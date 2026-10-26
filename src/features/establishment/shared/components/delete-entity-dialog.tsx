import { useState, type ReactNode } from "react"
import type { UseMutationResult } from "@tanstack/react-query"

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface DeleteResult {
  status: "ok" | "error"
  message: string
}

interface DeleteEntityDialogProps {
  id: number
  name: string
  description: ReactNode
  menuCode: string
  successMessage: string
  mutation: UseMutationResult<DeleteResult, unknown, number, unknown>
  onDeleted: () => void
  /** Condición extra además de Eliminar en el menú (p. ej. el nivel para dar de baja un EE). */
  allowed?: boolean
}

// Botón + confirmación de borrado de una fila; el feature aporta textos y mutation.
export function DeleteEntityDialog({
  id,
  name,
  description,
  menuCode,
  successMessage,
  mutation,
  onDeleted,
  allowed = true,
}: DeleteEntityDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()
  const { puedeEliminar } = useMenuPermission(menuCode, { onlineOnlyWrites: true })

  const handleDelete = () =>
    mutation.mutate(id, {
      onSuccess: (result) => {
        setOpen(false)
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(successMessage)
        onDeleted()
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    })

  if (!puedeEliminar || !allowed) return null

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
                  aria-label={`Eliminar ${name}`}
                />
              }
            />
          }
        >
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>{`Eliminar ${name}`}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
            onClick={handleDelete}
          >
            {mutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={mutation.isPending}>
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
