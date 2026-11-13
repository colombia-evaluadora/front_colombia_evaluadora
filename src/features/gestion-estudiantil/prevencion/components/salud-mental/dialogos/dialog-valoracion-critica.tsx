import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { CheckCircleIcon } from "@/components/ui/icons"

interface Props {
  pending: boolean
  onCancelar: () => void
  onConfirmar: () => void
}

/** Advertencia al guardar una severidad Crítico o Vital (G.8.SAL.5): qué se activa al confirmar (Reglas 10 y 20). */
export function DialogValoracionCritica({ pending, onCancelar, onConfirmar }: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onCancelar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Valoración crítica</DialogTitle>
          <DialogDescription>
            Se avisará al Administrador del establecimiento, se activará la ruta de remisión y se creará una citación
            presencial al acudiente para hoy.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" disabled={pending} />}>
            Cancelar
          </DialogClose>
          <Button size="sm" type="button" disabled={pending} onClick={onConfirmar}>
            <IconoCarga cargando={pending}>
              <CheckCircleIcon data-icon="inline-start" />
            </IconoCarga>
            Confirmar valoración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
