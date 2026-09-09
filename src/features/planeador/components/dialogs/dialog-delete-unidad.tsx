import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
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

import { useDeleteUnidad } from "@/features/planeador/api/mutations/delete-unidad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

interface DialogDeleteUnidadProps {
  unidad: Pick<UnidadTematica, "id" | "nombre">
  /** Además del toast, el panel reacciona (reselecciona otra unidad en el
   *  rail) cuando el delete termina OK — la unidad abierta ya no existe. */
  onDeleted?: () => void
  /** Se aplica al `Button` del trigger — mismo mecanismo que
   *  `DialogDeleteActividad`, para heredar variante/color/tamaño del
   *  contexto que lo monta. */
  triggerProps?: React.ComponentProps<typeof Button>
}

/**
 * Confirmación de borrado de una unidad temática. Mismo patrón que
 * `DialogDeleteActividad`: trigger con `TrashIcon`, copy explícito ("no se
 * puede deshacer"), botón `destructive` para confirmar, toast en
 * `onSuccess`.
 */
export function DialogDeleteUnidad({ unidad, onDeleted, triggerProps }: DialogDeleteUnidadProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const deleteMutation = useDeleteUnidad({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Unidad temática eliminada correctamente.")
        setOpen(false)
        onDeleted?.()
      },
      onError: () => {
        notify("No se pudo eliminar la unidad temática.", { variant: "error" })
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
            aria-label={`Eliminar ${unidad.nombre}`}
            {...triggerProps}
          />
        }
      >
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar unidad temática</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente la unidad &ldquo;{unidad.nombre}&rdquo;, junto con sus
            criterios y actividades vinculadas. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(unidad.id)}
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
