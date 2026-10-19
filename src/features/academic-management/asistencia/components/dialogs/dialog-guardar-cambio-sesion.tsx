import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CheckIcon, SpinnerIcon, TrashIcon, WarningIcon } from "@/components/ui/icons"
import type { useOnlineOnly } from "@/lib/offline/use-online-only"

// Pregunta si guardar antes de cambiar de sesión.
export function DialogGuardarCambioSesion({
  open,
  guardandoCambio,
  soloEnLineaCambio,
  onCancelar,
  onDescartar,
  onGuardar,
}: {
  open: boolean
  guardandoCambio: boolean
  soloEnLineaCambio: ReturnType<typeof useOnlineOnly>
  onCancelar: () => void
  onDescartar: () => void
  onGuardar: () => void
}) {
  return (
      <AlertDialog
        open={open}
        onOpenChange={(open) => {
          if (!open && !guardandoCambio) onCancelar()
        }}
      >
        <AlertDialogContent className="data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia className="size-12 rounded-full bg-yellow-22 text-yellow *:[svg:not([class*='size-'])]:size-6">
              <WarningIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Guardar la asistencia antes de salir?</AlertDialogTitle>
            <AlertDialogDescription>
              Marcaste asistencia en esta sesión y todavía no la guardas. Si cambias de sesión sin guardar, se pierde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:items-center">
            <AlertDialogCancel variant="ghost" color="neutral" disabled={guardandoCambio} className="sm:mr-auto">
              Seguir editando
            </AlertDialogCancel>
            <Button variant="outline" color="destructive" disabled={guardandoCambio} onClick={onDescartar}>
              <TrashIcon data-icon="inline-start" />
              Descartar
            </Button>
            <Button
              color="primary"
              disabled={guardandoCambio || soloEnLineaCambio.disabled}
              title={soloEnLineaCambio.tooltip ?? undefined}
              aria-busy={guardandoCambio}
              onClick={onGuardar}
            >
              {guardandoCambio ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {guardandoCambio ? "Guardando…" : "Guardar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  )
}
