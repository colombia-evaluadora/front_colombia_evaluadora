import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useAccesoConfiguracionQuery } from "@/features/gestion-estudiantil/configuracion/api/query/use-configuracion-query"
import { ACCESO_NINGUNO } from "@/features/gestion-estudiantil/configuracion/api/types"
import { useEstablecimientoConfiguracion } from "@/features/gestion-estudiantil/configuracion/hooks/use-establecimiento-configuracion"

/**
 * Establecimiento y banderas de Configuración: el menú CONFIGURACION_GE abre la página y lo que cada usuario
 * puede hacer lo dice `GET /configuracion/acceso` (sin respuesta, todo deshabilitado).
 */
export function useConfiguracionAcceso() {
  const menu = useMenuPermission("CONFIGURACION_GE")
  const establecimiento = useEstablecimientoConfiguracion()
  const accesoQ = useAccesoConfiguracionQuery(menu.puedeVer ? establecimiento.id : null)
  return {
    establecimiento,
    acceso: accesoQ.data ?? ACCESO_NINGUNO,
    // isLoading y no isPending: sin establecimiento (o sin menú) la consulta está deshabilitada y isPending
    // se queda en true para siempre — la tabla no salía del skeleton (QA, establecimientos sin períodos).
    cargando: establecimiento.cargando || accesoQ.isLoading,
    sinEstablecimiento: !establecimiento.cargando && !establecimiento.error && establecimiento.opciones.length === 0,
    error: establecimiento.error ?? accesoQ.error,
  }
}
