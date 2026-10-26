import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { evalCol } from "@/lib/eval-col-client"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"

interface PermisoGestionRow {
  puede_gestionar: boolean
}

/** Con mocks no hay niveles: decide solo Eliminar del menú, como antes. */
async function fetchPuedeGestionarEstablecimientos(): Promise<boolean> {
  if (env.ENABLE_API_MOCKING) return true
  const rows = await evalCol.getRows<PermisoGestionRow>("/establecimientos/permisos/gestion")
  return rows[0]?.puede_gestionar === true
}

/**
 * ¿El usuario puede crear y dar de baja establecimientos y cambiar su rector y
 * su secretaria? Hacen falta las dos cosas que exige el back
 * (`fn_est_assert_gestion`, V574): Eliminar en el menú ESTABLECIMIENTO —lo que
 * se configura en Roles y menús— y ser Superadministrador o de nivel
 * territorial. Un rector, jefe de sistema o auxiliar ve y edita los datos de su
 * EE, nada más, aunque su rol tenga Eliminar.
 *
 * Sin Eliminar no se pregunta al back: la respuesta ya es no. `data` es
 * `false` mientras carga o si la consulta falla.
 */
export function usePuedeGestionarEstablecimientosQuery() {
  const { puedeEliminar, isLoading: permisoCargando } = useMenuPermission("ESTABLECIMIENTO")
  const query = useQuery({
    queryKey: establishmentKeys.permisoGestion(),
    queryFn: fetchPuedeGestionarEstablecimientos,
    enabled: puedeEliminar,
    // Depende de los roles del usuario, que no cambian sin volver a iniciar sesión.
    staleTime: Infinity,
  })

  return {
    data: puedeEliminar && query.data === true,
    isLoading: permisoCargando || (puedeEliminar && query.isLoading),
  }
}
