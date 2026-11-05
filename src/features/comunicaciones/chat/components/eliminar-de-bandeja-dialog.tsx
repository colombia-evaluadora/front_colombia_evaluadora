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
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

/**
 * "Eliminar de mi bandeja" (informe de Comunicaciones §4.3, prototipo M.2.RET.2): un solo diálogo
 * para un mensaje o para una conversación, que nombra lo que se oculta. Los textos son los del
 * informe (por eso van de usted). Solo deja de verlo quien lo pide: comms-service no toca la copia
 * de los demás, su lectura ni el registro conservado.
 */
export function EliminarDeBandejaDialog({
  open,
  conversacion,
  pendiente,
  error,
  onConfirmar,
  onClose,
}: {
  open: boolean
  // Nombre de la conversación que se oculta; sin él, lo que se oculta es un mensaje.
  conversacion?: string
  pendiente: boolean
  error: unknown
  onConfirmar: () => void
  onClose: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !pendiente && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar de mi bandeja</AlertDialogTitle>
        </AlertDialogHeader>
        <ErrorNoticeBanner error={error ?? null} />
        <AlertDialogDescription>
          {conversacion
            ? `La conversación ${conversacion} dejará de verse en su bandeja.`
            : "El mensaje dejará de verse en su bandeja."}
          <br />
          No se elimina la copia de los otros participantes ni el registro conservado, y no cambia la lectura
          de los demás.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel variant="fill" color="neutral" disabled={pendiente}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pendiente}
            aria-busy={pendiente}
            onClick={(e) => {
              // El diálogo se cierra al terminar (o muestra el error), no al pulsar.
              e.preventDefault()
              onConfirmar()
            }}
          >
            Eliminar de mi bandeja
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
