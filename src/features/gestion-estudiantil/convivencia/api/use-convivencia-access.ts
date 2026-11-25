import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useCapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"
import { accesoConvivencia } from "@/features/gestion-estudiantil/convivencia/utils/access"

/** Qué acciones de página ofrecer (capacidades del backend + menú); el backend vuelve a validar cada una. */
export function useConvivenciaAccess() {
  const permiso = useMenuPermission("CONVIVENCIA")
  const { data: cap } = useCapacidadesGe()
  return accesoConvivencia(cap, permiso)
}

export type ConvivenciaAccess = ReturnType<typeof useConvivenciaAccess>
