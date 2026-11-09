import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

import { useProcesoDetalleQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-detalle-query"
import { DialogAjustarFechas } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-ajustar-fechas"
import { DialogNotificacionPresencial } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-notificacion-presencial"
import { DialogRegistrarCumplimiento } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-registrar-cumplimiento"
import { DialogRegistrarDecision } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-registrar-decision"
import { DialogRegistrarDescargos } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-registrar-descargos"
import { DialogRegistrarRecurso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-registrar-recurso"
import { DialogResolverRecurso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-resolver-recurso"
import type { AccionEtapa } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"

export interface DialogoActivo {
  accion: AccionEtapa
  procesoId: number
  sancionId?: number
}

interface Props {
  activo: DialogoActivo
  onClose: () => void
}

/**
 * Modal de etapa activo. Pide el detalle del proceso (ya en caché cuando se abre desde el detalle) y
 * monta el modal de la acción solo cuando llega: así su estado de formulario nace limpio en cada apertura.
 */
export function DialogosProceso({ activo, onClose }: Props) {
  const { data: p, isPending, error } = useProcesoDetalleQuery(activo.procesoId)

  if (!p) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cargando el proceso</DialogTitle>
            <DialogDescription>Se están trayendo los datos del proceso.</DialogDescription>
          </DialogHeader>
          {isPending ? <Skeleton className="h-32" /> : <ErrorNoticeBanner error={error ?? true} fallback="No se encontró el proceso." />}
        </DialogContent>
      </Dialog>
    )
  }

  switch (activo.accion) {
    case "descargos":
      return <DialogRegistrarDescargos proceso={p} onClose={onClose} />
    case "decision":
      return <DialogRegistrarDecision proceso={p} onClose={onClose} />
    case "notificar":
      return <DialogNotificacionPresencial proceso={p} onClose={onClose} />
    case "recurso":
      return <DialogRegistrarRecurso proceso={p} onClose={onClose} />
    case "resolver": {
      const recurso = p.etapas.recursos.items.find((r) => r.estado === "PENDIENTE")
      return recurso ? <DialogResolverRecurso proceso={p} recurso={recurso} onClose={onClose} /> : null
    }
    case "ajustar":
      return <DialogAjustarFechas proceso={p} sancionId={activo.sancionId} onClose={onClose} />
    case "cumplimiento":
      return <DialogRegistrarCumplimiento proceso={p} sancionId={activo.sancionId} onClose={onClose} />
  }
}
