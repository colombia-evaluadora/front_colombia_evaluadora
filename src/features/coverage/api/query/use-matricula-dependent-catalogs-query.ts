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
 * Jornadas disponibles para una Sede+Grado, y grupos disponibles para un
 * Grado — usado por los selects en cascada de "Modificar" (Sede/Jornada
 * dependen entre sí, Grupo depende de Grado). Se activa apenas hay campus o
 * grado (uno solo alcanza para consultar; el mock resuelve con lo que
 * tenga).
 */
export function useMatriculaDependentCatalogsQuery(params: MatriculaDependentCatalogsRequest) {
  const { campus, grade } = params
  return useQuery({
    queryKey: ["matricula", "catalogos-dependientes", campus, grade],
    queryFn: () => fetchMatriculaDependentCatalogs({ campus, grade }),
    enabled: campus != null || grade != null,
    staleTime: 30_000,
  })
}
