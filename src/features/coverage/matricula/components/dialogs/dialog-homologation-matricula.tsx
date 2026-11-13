import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckIcon, WarningIcon, XIcon } from "@/components/ui/icons"

interface HomologationMatriculaDialogProps {
  /** Establecimiento de donde viene el estudiante, según el snapshot del traslado. */
  institucionOrigen: string
  onChoice: (homologate: boolean) => void
}

/**
 * Pregunta de homologación al guardar un traslado (Sección 4.5). La matrícula ya
 * quedó guardada; elegir «No homologar por ahora» deja el snapshot para después.
 */
export function HomologationMatriculaDialog({ institucionOrigen, onChoice }: HomologationMatriculaDialogProps) {
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <WarningIcon className="size-6 shrink-0 text-yellow" aria-hidden />
            <DialogTitle>¿Homologar las notas del traslado?</DialogTitle>
          </div>
          <DialogDescription>
            El estudiante tiene notas en <span className="font-semibold text-foreground">{institucionOrigen}</span>. Si
            no las homologa ahora, los períodos transcurridos quedan Pendientes por nivelación.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onChoice(false)}>
            <XIcon data-icon="inline-start" />
            No homologar por ahora
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => onChoice(true)}>
            <CheckIcon data-icon="inline-start" />
            Homologar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
