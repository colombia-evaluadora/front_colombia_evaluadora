import { esGrave } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { SeccionCierre } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-cierre"
import { SeccionDatosCasoDetalle } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-datos"
import { SeccionPersonas } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-personas"
import { SeccionProtocolo } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-protocolo"
import { SeccionSesionesComite } from "@/features/gestion-estudiantil/convivencia/components/detalle/seccion-sesiones-comite"
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
      {(esGrave(caso.tipo_codigo) || Boolean(caso.sesiones_comite?.length)) && <SeccionSesionesComite caso={caso} />}
    </>
  )
}
