import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  MatriculaDependentCatalogsRequest,
  MatriculaDependentCatalogsResponse,
} from "@/features/coverage/api/types/matricula"

function fetchMatriculaDependentCatalogs(
  body: MatriculaDependentCatalogsRequest,
): Promise<MatriculaDependentCatalogsResponse> {
  return api.query("/coverage/matricula/catalogos-dependientes", body)
}

/**
 * Cascada Sede → Jornada → Grado → Grupo para los selects de "Modificar":
 * jornadas disponibles por sede, grados disponibles por jornada, grupos
 * disponibles por grado. Se activa apenas hay algún prerequisito (uno solo
 * alcanza para consultar; el mock resuelve con lo que tenga).
 */
export function useMatriculaDependentCatalogsQuery(params: MatriculaDependentCatalogsRequest) {
  const { campus, shift, grade } = params
  return useQuery({
    queryKey: ["matricula", "catalogos-dependientes", campus, shift, grade],
    queryFn: () => fetchMatriculaDependentCatalogs({ campus, shift, grade }),
    enabled: campus != null || shift != null || grade != null,
    staleTime: 30_000,
  })
}
