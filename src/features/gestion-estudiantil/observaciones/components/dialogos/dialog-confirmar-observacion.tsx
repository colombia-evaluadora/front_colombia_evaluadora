import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon } from "@/components/ui/icons"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import type { ResumenObservacion } from "@/features/gestion-estudiantil/observaciones/api/types"
import { destinoConfirmacion } from "@/features/gestion-estudiantil/observaciones/utils/formularios"

interface Props {
  resumen: ResumenObservacion[]
  pending: boolean
  onCancelar: () => void
  onConfirmar: () => void
}

/**
 * Confirmar la observación (G.7.ACC.1): a cuántos estudiantes de qué grupos se aplica y en qué boletín
 * sale. Cancelar vuelve al formulario sin perder lo escrito.
 */
export function DialogConfirmarObservacion({ resumen, pending, onCancelar, onConfirmar }: Props) {
  const periodos = [...new Set(resumen.map((r) => r.periodo_nombre).filter(Boolean))]
  const boletin =
    periodos.length === 1
      ? `Saldrá en su boletín del ${periodos[0]} y la verán sus acudientes.`
      : "Saldrá en el boletín del Período de Evaluación de cada grupo y la verán sus acudientes."

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onCancelar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar la observación</DialogTitle>
          <DialogDescription>
            Esta observación se aplicará a <strong>{destinoConfirmacion(resumen)}</strong>. {boletin}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" disabled={pending} onClick={onCancelar}>
            Cancelar
          </Button>
          <Button size="sm" type="button" disabled={pending} onClick={onConfirmar}>
            <IconoCarga cargando={pending}>
              <CheckIcon data-icon="inline-start" />
            </IconoCarga>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
