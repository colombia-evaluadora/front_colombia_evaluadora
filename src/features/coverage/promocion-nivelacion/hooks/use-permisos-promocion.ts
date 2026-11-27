import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useUser } from "@/lib/auth"

import { MENU_PROMOCION } from "../api/promocion"

/** Rol exacto, con o sin prefijo (CEVAL-RECTOR): «RECTOR» no debe casar con DIRECTOR_GRUPO. */
const tieneRol = (roles: string[], codigos: string[]) =>
  roles.some((r) => codigos.includes(r.replace(/^.*-/, "")))

/**
 * Sección 4.7: Promover y Ampliar plazo, solo Administrador o Gestor; Anular, solo
 * Administrador; Registrar y Corregir, quien tenga Guardar (incluido el Supervisor de sede).
 */
export function usePermisosPromocion() {
  const { puedeEditar, puedeEliminar } = useMenuPermission(MENU_PROMOCION)
  const { data: usuario } = useUser()
  const roles = usuario?.roles ?? []
  return {
    puedeNivelar: puedeEditar,
    puedeGestionar: puedeEditar && tieneRol(roles, ["RECTOR", "AUXILIAR_ADMINISTRATIVO"]),
    puedeAnular: puedeEliminar && tieneRol(roles, ["RECTOR"]),
  }
}
