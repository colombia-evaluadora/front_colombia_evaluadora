import { useQuery } from "@tanstack/react-query"

import { fetchSedeOptions } from "@/features/establishment/academic-period/api/query/use-sede-options"
import type { MatriculaCampusCatalog } from "@/features/coverage/api/types/matricula"

async function fetchMatriculaCampuses(): Promise<MatriculaCampusCatalog> {
  const sedes = await fetchSedeOptions()
  return { campuses: sedes.map((sede) => sede.nombre) }
}

export function useMatriculaCampusesQuery() {
  return useQuery({
    queryKey: ["matricula", "campuses"],
    queryFn: fetchMatriculaCampuses,
    staleTime: 5 * 60 * 1000,
  })
}
