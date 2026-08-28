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

import { useDeleteActividad } from "@/features/planeador/api/mutations/delete-actividad"
import type { Actividad } from "@/features/planeador/api/types/actividad"

interface DialogDeleteActividadProps {
  actividad: Pick<Actividad, "id" | "nombre">
  /** Además del toast, la página puede querer reaccionar (limpiar la URL,
   * cerrar el panel, etc.) cuando el delete termina OK. */
  onDeleted?: () => void
}

/**
 * Confirmación de borrado de una actividad del Planeador.
 *
 * Mismo patrón que `DialogDeleteMatricula`: trigger con `TrashIcon`,
 * AlertDialog con copy explícito ("no se puede deshacer"), botón
 * `destructive` para confirmar, toast en `onSuccess`. El trigger hereda
 * el tamaño/color del contexto que lo monta (la card ya le pasa
 * `variant="ghost" color="neutral" size="icon-sm"` vía la prop
 * `triggerProps`).
 */
export function DialogDeleteActividad({
  actividad,
  onDeleted,
  triggerProps,
}: DialogDeleteActividadProps & {
  /** Se aplica al `Button` del trigger — la card le pasa su variante
   * ghost/neutral/icon-sm para que viva dentro del overlay de acciones. */
  triggerProps?: React.ComponentProps<typeof Button>
}) {
  const [open, setOpen] = useState(false)

  const deleteMutation = useDeleteActividad({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success("Actividad eliminada correctamente.")
        setOpen(false)
        onDeleted?.()
      },
      onError: () => {
        toast.error("No se pudo eliminar la actividad.")
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
            aria-label={`Eliminar ${actividad.nombre}`}
            {...triggerProps}
          />
        }
      >
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar actividad</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente la actividad &ldquo;{actividad.nombre}&rdquo;.
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(actividad.id)}
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
