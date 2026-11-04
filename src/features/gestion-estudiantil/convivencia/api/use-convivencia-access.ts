import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { accesoConvivencia } from "@/features/gestion-estudiantil/convivencia/utils/access"

/** Qué acciones ofrecer; el backend vuelve a validar cada una con su gate y alcance. */
export function useConvivenciaAccess() {
  const { user } = useAuth()
  const permiso = useMenuPermission("CONVIVENCIA")
  return accesoConvivencia(user?.roles ?? [], permiso)
}

export type ConvivenciaAccess = ReturnType<typeof useConvivenciaAccess>
