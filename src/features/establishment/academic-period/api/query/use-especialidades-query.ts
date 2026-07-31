import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

function fetchEspecialidades(): Promise<string[]> {
  return api.get("/especialidades")
}

export const especialidadesQueryKey = () => ["especialidades"]

// Catálogo estable de especialidades; se cachea indefinidamente como las
// demás listas de referencia.
export function useEspecialidadesQuery() {
  return useQuery({
    queryKey: especialidadesQueryKey(),
    queryFn: fetchEspecialidades,
    staleTime: Infinity,
  })
}