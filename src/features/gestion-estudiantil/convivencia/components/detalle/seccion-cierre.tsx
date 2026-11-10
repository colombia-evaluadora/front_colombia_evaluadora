import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { AvisosCierre } from "@/features/gestion-estudiantil/convivencia/components/detalle/avisos-cierre"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"

/** «Anulación» o «Cierre» del caso; solo existe en un caso final, y abre por defecto. */
export function SeccionCierre({ caso }: { caso: CasoDetalle }) {
  if (!caso.anulacion && !caso.cierre) return null
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo={caso.anulacion ? "Anulación" : "Cierre"}
      contentClassName="flex flex-col gap-3 px-4 py-4"
    >
      <AvisosCierre caso={caso} />
    </SeccionPlegable>
  )
}
