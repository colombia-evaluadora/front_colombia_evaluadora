import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { fetchSedeJornadasActivas } from "@/features/establishment/employees/api/query/use-sede-jornadas"
import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"
import type {
  MatriculaDependentCatalogsRequest,
  MatriculaDependentCatalogsResponse,
} from "@/features/coverage/api/types/matricula"

interface MockedDependentCatalogs {
  grades: number[]
  groups: string[]
}

// Grado/Grupo siguen mockeados (son entidades reales de TGRADO/TGRUPO
// scopeadas por período/sede, no TLISTA_VALOR — ver `use-matricula-
// dependent-catalogs-query` en `docs/matricula-listado-endpoint-contract.md`).
function fetchMockedDependentCatalogs(
  body: MatriculaDependentCatalogsRequest,
): Promise<MockedDependentCatalogs> {
  return api.query("/coverage/matricula/catalogos-dependientes", body)
}

/**
 * Jornada por sede sale del mismo endpoint real que ya usa "Permisos de
 * funcionario" (`dialog-manage.tsx` → `use-sede-jornadas.ts`,
 * `fn_jornadas_activas_por_sede`): jornadas de un periodo académico ACTIVO
 * de esa sede — no el catálogo genérico `TLISTA_VALOR JORNADA`
 * (`TLISTA_VALOR JORNADA` sin scope), que no tiene relación con la sede real.
 * Ese endpoint pide el ID de la sede; acá `campus` sigue viajando como
 * nombre (así lo usa todo el módulo de matrícula), así que se resuelve
 * contra `useSedeOptionsQuery` antes de pedir las jornadas.
 */
async function fetchShiftsForSede(sedeId: number): Promise<string[]> {
  const jornadas = await fetchSedeJornadasActivas(sedeId)
  return jornadas.map((jornada) => jornada.nombre)
}

/**
 * Cascada Sede → Jornada → Grado → Grupo para los selects de "Modificar":
 * jornadas disponibles por sede, grados disponibles por jornada, grupos
 * disponibles por grado. Se activa apenas hay algún prerequisito (uno solo
 * alcanza para consultar; el mock resuelve con lo que tenga).
 */
export function useMatriculaDependentCatalogsQuery(params: MatriculaDependentCatalogsRequest) {
  const { campus, shift, grade } = params
  const { data: sedes } = useSedeOptionsQuery()
  const sedeId = campus ? sedes?.find((sede) => sede.nombre === campus)?.pk_sede : undefined

  return useQuery({
    queryKey: ["matricula", "catalogos-dependientes", campus, shift, grade, sedeId],
    queryFn: async (): Promise<MatriculaDependentCatalogsResponse> => {
      const [mocked, shifts] = await Promise.all([
        fetchMockedDependentCatalogs({ campus, shift, grade }),
        sedeId != null ? fetchShiftsForSede(sedeId) : Promise.resolve<string[]>([]),
      ])
      return { shifts, grades: mocked.grades, groups: mocked.groups }
    },
    enabled: campus != null || shift != null || grade != null,
    staleTime: 30_000,
  })
}
