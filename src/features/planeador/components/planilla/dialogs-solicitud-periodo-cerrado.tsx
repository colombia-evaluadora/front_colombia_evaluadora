import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, SpinnerIcon, WarningCircleIcon } from "@/components/ui/icons"

interface DialogEnviarSolicitudProps {
  open: boolean
  enviando: boolean
  onEnviar: () => void
  onCancelar: () => void
}

/** Confirma el envío de notas cambiadas en un periodo cerrado. */
export function DialogEnviarSolicitud({ open, enviando, onEnviar, onCancelar }: DialogEnviarSolicitudProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !enviando && onCancelar()}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-[30rem]">
        <AlertDialogHeader className="w-full justify-items-center text-center sm:group-data-[size=default]/alert-dialog-content:place-items-center sm:group-data-[size=default]/alert-dialog-content:text-center">
          <WarningCircleIcon className="text-orange mx-auto size-14" />
          <AlertDialogTitle className="text-center text-wrap">
            Has realizado cambios en calificaciones de un periodo finalizado.
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Para aplicarlos, debes enviar una solicitud de aprobación.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <Button variant="fill" color="primary" disabled={enviando} onClick={onEnviar}>
            {enviando && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
            Enviar solicitud
          </Button>
          <Button variant="fill" color="neutral" disabled={enviando} onClick={onCancelar}>
            Cancelar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface DialogSolicitudEnviadaProps {
  open: boolean
  onCerrar: () => void
}

export function DialogSolicitudEnviada({ open, onCerrar }: DialogSolicitudEnviadaProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCerrar()}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-[30rem]">
        <AlertDialogHeader className="w-full justify-items-center text-center sm:group-data-[size=default]/alert-dialog-content:place-items-center sm:group-data-[size=default]/alert-dialog-content:text-center">
          <CheckCircleIcon className="text-green mx-auto size-14" />
          <AlertDialogTitle className="text-center">Solicitud enviada con éxito.</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            El administrador ha sido notificado y revisará los cambios realizados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <Button variant="fill" color="neutral" onClick={onCerrar}>
            Cerrar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
