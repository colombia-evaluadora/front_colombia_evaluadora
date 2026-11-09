import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import type { PermisosCitaciones } from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"

/**
 * Permisos del menú CITACIONES_COMPROMISOS. El backend vuelve a validar cada acción con su gate
 * (quién atiende, quién gestiona el origen, alcance de sede/jornada) y no manda banderas `puede_*`.
 */
export function useCitacionesAccess(): PermisosCitaciones & { puedeVer: boolean } {
  const { puedeCrear, puedeEditar, puedeVer } = useMenuPermission("CITACIONES_COMPROMISOS")
  return { puedeCrear, puedeEditar, puedeVer }
}
