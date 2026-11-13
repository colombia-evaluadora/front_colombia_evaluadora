import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"

const TEXTO = {
  servicios: "los servicios básicos marcados",
  programas: "los programas sociales elegidos",
} as const

/** Avisa antes de limpiar las selecciones previas al cambiar la respuesta principal de servicios o programas. */
export function DialogoConfirmarLimpieza({ f }: { f: FormularioCaracterizacion }) {
  const pendiente = f.pendienteLimpieza
  return (
    <AlertDialog open={pendiente != null} onOpenChange={(abierto) => !abierto && f.cancelarLimpieza()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cambiar la respuesta?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta respuesta no admite selecciones concretas: se quitarán {pendiente ? TEXTO[pendiente.campo] : ""}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={f.confirmarLimpieza}>Cambiar y quitar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
