import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { accesoPiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

/** Qué botones ver; el backend vuelve a validar cada acción con su gate y alcance. */
export function usePiarAccess() {
  const { user } = useAuth()
  const permiso = useMenuPermission("INCLUSION_ORIENTACION")
  return { ...accesoPiar(user?.roles ?? [], permiso), puedeCrear: permiso.puedeCrear }
}
