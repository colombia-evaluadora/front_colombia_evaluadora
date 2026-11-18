import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useCapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"

/**
 * Permisos del menú OBSERVACIONES_SUGERENCIAS más la capacidad `observaciones_puede_registrar` que
 * decide el backend: «Nueva observación» se deshabilita (no se oculta) para quien solo consulta y
 * mientras carga. El selector Grado/Grupo solo trae los de su designación y el gate vuelve a validar.
 */
export function useObservacionesAccess() {
  const { puedeCrear, puedeVer } = useMenuPermission("OBSERVACIONES_SUGERENCIAS")
  const { data: cap } = useCapacidadesGe()
  return {
    puedeVer,
    puedeCrear: puedeCrear && Boolean(cap?.observaciones_puede_registrar),
  }
}
