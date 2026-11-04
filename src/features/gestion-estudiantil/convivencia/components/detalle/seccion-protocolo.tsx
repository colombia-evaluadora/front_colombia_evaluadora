import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { SeccionHistorial } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-historial"
import { SeccionPasos } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-pasos"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"

/** «Protocolo»: pasos obligatorios y historial de acciones, cada uno con su encabezado. */
export function SeccionProtocolo({ caso }: { caso: CasoDetalle }) {
  return (
    <SeccionPlegable
      encuadrada
      titulo="Protocolo"
      contentClassName="flex flex-col gap-6 px-4 py-4"
    >
      <SeccionPasos casoId={caso.id} />
      <SeccionHistorial caso={caso} />
    </SeccionPlegable>
  )
}
