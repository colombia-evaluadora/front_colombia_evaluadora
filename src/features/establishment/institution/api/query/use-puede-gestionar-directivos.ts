import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { evalCol } from "@/lib/eval-col-client"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"

interface PermisoDirectivosRow {
  puede_gestionar_directivos: boolean
}

/**
 * ¿El usuario puede crear establecimientos y cambiar su rector y su
 * secretaria? Solo el Superadministrador y el nivel territorial
 * (`fn_est_puede_gestionar_directivos`, V598): rector, jefe de sistema y
 * auxiliar editan los datos del EE pero no sus directivos. Lo decide el back
 * —también lo exige al guardar—; esto es solo para que la pantalla no ofrezca
 * lo que va a rechazar.
 *
 * Con mocks no hay niveles: se permite todo, como antes.
 */
async function fetchPuedeGestionarDirectivos(): Promise<boolean> {
  if (env.ENABLE_API_MOCKING) return true
  const rows = await evalCol.getRows<PermisoDirectivosRow>("/establecimientos/permisos/directivos")
  return rows[0]?.puede_gestionar_directivos === true
}

/** `data` queda `undefined` mientras carga o si falla: quien lo usa lo trata como "no". */
export function usePuedeGestionarDirectivosQuery() {
  return useQuery({
    queryKey: establishmentKeys.permisoDirectivos(),
    queryFn: fetchPuedeGestionarDirectivos,
    // Depende de los roles del usuario, que no cambian sin volver a iniciar sesión.
    staleTime: Infinity,
  })
}
