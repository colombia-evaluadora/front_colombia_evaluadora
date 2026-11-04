import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { SeccionCierre } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-cierre"
import { SeccionDatosCasoDetalle } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-datos"
import { SeccionPersonas } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-personas"
import { SeccionProtocolo } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-protocolo"
import { SeccionSiuceDetalle } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-siuce"

/**
 * Detalle con acceso completo, en secciones plegables como el formulario: cierre/anulación (si es final),
 * datos, SIUCE, personas y protocolo. Abren por defecto las que se consultan siempre; SIUCE y otros
 * involucrados, plegadas.
 */
export function DatosCompletos({ caso }: { caso: CasoDetalle }) {
  return (
    <>
      <SeccionCierre caso={caso} />
      <SeccionDatosCasoDetalle caso={caso} />
      <SeccionSiuceDetalle caso={caso} />
      <SeccionPersonas caso={caso} />
      <SeccionProtocolo caso={caso} />
    </>
  )
}
