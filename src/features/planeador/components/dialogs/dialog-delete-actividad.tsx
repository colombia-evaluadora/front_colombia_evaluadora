import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
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
  const { notify } = useNotify()

  const deleteMutation = useDeleteActividad({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Actividad eliminada correctamente.")
        setOpen(false)
        onDeleted?.()
      },
      // El mensaje real del backend, no uno genérico: `fn_actividad_eliminar`
      // (V482) rechaza el borrado con el motivo puntual cuando la actividad
      // ya tiene notas, observaciones, capturas de instrumento, asistencia o
      // recuperaciones asociadas — sin ese texto el docente no sabe por qué
      // no puede borrarla.
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

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
                  aria-label={`Eliminar ${actividad.nombre}`}
                  {...triggerProps}
                />
              }
            />
          }
        >
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>{`Eliminar ${actividad.nombre}`}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar actividad</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente la actividad &ldquo;{actividad.nombre}&rdquo;. Esta acción
            no se puede deshacer.
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
