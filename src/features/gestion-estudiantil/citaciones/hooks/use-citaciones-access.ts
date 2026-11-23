import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useCapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"

/**
 * Permisos del menú CITACIONES_COMPROMISOS más las capacidades que decide el backend
 * (`citaciones_puede_citar`, `citaciones_puede_crear_compromiso`, de `GET /gestion-estudiantil/capacidades`):
 * «Nueva citación» y «Nuevo compromiso» se deshabilitan (no se ocultan) sin ellas y mientras cargan.
 * Convivencia usa `puedeCrearCitacion` para «Citar» y `puedeCrearCompromiso` para «Crear compromiso».
 */
export function useCitacionesAccess() {
  const { puedeCrear, puedeVer } = useMenuPermission("CITACIONES_COMPROMISOS")
  const { data: cap } = useCapacidadesGe()
  const puedeCrearCitacion = puedeCrear && Boolean(cap?.citaciones_puede_citar)
  return {
    puedeVer,
    puedeCrearCitacion,
    puedeCrearCompromiso: puedeCrear && Boolean(cap?.citaciones_puede_crear_compromiso),
  }
}
