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
  comunicado = false,
  pendiente,
  error,
  onConfirmar,
  onClose,
}: {
  open: boolean
  // Nombre de la conversación que se oculta; sin él, lo que se oculta es un mensaje.
  conversacion?: string
  // Comunicado institucional recibido: nombra "El comunicado" y aclara que su lectura queda registrada.
  comunicado?: boolean
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
          {/* M.2.RET.2: lo que se oculta va en negrita y la aclaración en la línea siguiente. */}
          <span className="block">
            {conversacion ? (
              <>
                {comunicado ? "El comunicado" : "La conversación"}{" "}
                <strong className="text-foreground">{conversacion}</strong> dejará de verse en su bandeja.
              </>
            ) : (
              "El mensaje dejará de verse en su bandeja."
            )}
          </span>
          <span className="mt-2 block">
            {comunicado
              ? "Su lectura queda registrada. No se elimina la copia de los demás destinatarios ni el registro conservado."
              : "No se elimina la copia de los otros participantes ni el registro conservado, y no cambia la lectura de los demás."}
          </span>
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            color="destructive"
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
