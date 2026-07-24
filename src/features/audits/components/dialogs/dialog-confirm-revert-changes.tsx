import { useState } from "react"

import { ArrowCounterClockwiseIcon, SpinnerIcon } from "@/components/ui/icons"
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

import { useRevertOperationChange } from "../../api/mutations/revert-operation-change"

interface DialogConfirmRevertChangesProps {
  tableSlug: string
  operationId: string
  fieldIndexes: number[]
}

/**
 * Tercer dialog del flujo de cambios: pide confirmación antes de mandar el
 * revert. Recibe el `operationId` (y el slug) desde el dialog padre — la
 * acción destructiva nunca se dispara sin paso explícito por acá.
 */
export function DialogConfirmRevertChanges({
  tableSlug,
  operationId,
  fieldIndexes,
}: DialogConfirmRevertChangesProps) {
  const [open, setOpen] = useState(false)

  const revertChange = useRevertOperationChange({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setOpen(false)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    },
  })

  const disabled = revertChange.isPending || fieldIndexes.length === 0

  function handleConfirm() {
    revertChange.mutate({ tableSlug, operationId, fieldIndexes })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label="Revertir todos los cambios mostrados"
          />
        }
      >
        <ArrowCounterClockwiseIcon
          weight="bold"
          data-icon="inline-start"
        />
        Revertir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Revertir los cambios?</AlertDialogTitle>
          <AlertDialogDescription>
            Se van a restaurar {fieldIndexes.length} campo(s) a su valor
            anterior. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={revertChange.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={revertChange.isPending}
            aria-busy={revertChange.isPending}
            onClick={handleConfirm}
          >
            {/* El spinner reemplaza al icono en vez de sumarse: así el ancho
                del botón no salta al entrar en loading. */}
            {revertChange.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
            )}
            Revertir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
