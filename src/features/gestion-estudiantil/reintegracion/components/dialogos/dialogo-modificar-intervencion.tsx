import { FloppyDiskIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useIntervencionQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-intervenciones-query"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { DialogoIntervencion } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-intervencion"

interface Props {
  caso: CasoDetalle
  intervencionId: number
  onClose: () => void
}

/** Carga la intervención completa (las ocho secciones y sus evidencias) y abre el diálogo en modo edición. */
export function DialogoModificarIntervencion({ caso, intervencionId, onClose }: Props) {
  const q = useIntervencionQuery(caso.id, intervencionId)
  if (q.data) return <DialogoIntervencion caso={caso} intervencion={q.data} onClose={onClose} />
  return (
    <DialogoOperacionShell
      titulo={`Modificar intervención — ${caso.estudiante_nombre}`}
      className="sm:max-w-3xl"
      onClose={onClose}
      error={q.error}
      pending={false}
      confirmar={{ label: "Guardar", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: onClose, disabled: true }}
    >
      {!q.isError && <Skeleton className="h-40" />}
    </DialogoOperacionShell>
  )
}
