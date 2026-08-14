import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { TeachingLevel } from "@/features/establishment/academic-period/api/types/rating-scales"

interface TeachingLevelRow {
  id: number
  codigo: string
  nombre: string
}
interface TeachingLevelsResponse {
  rows: TeachingLevelRow[]
}

// `GET /eval-col/niveles-ensenanza` (`fn_nivel_ensenanza_listar`, id_query
// 67) — catálogo global, sin scoping por periodo. `grados` (opcional en el
// tipo) no lo devuelve esta función; queda sin poblar.
export async function fetchTeachingLevels(): Promise<TeachingLevel[]> {
  const raw: TeachingLevelsResponse = await api.get("/eval-col/niveles-ensenanza")
  return (raw.rows ?? []).map((row) => ({ id: row.id, nombre: row.nombre }))
}

export const teachingLevelsQueryKey = () => ["teaching-levels"]

export function useTeachingLevelsQuery() {
  return useQuery({
    queryKey: teachingLevelsQueryKey(),
    queryFn: fetchTeachingLevels,
    staleTime: Infinity,
  })
}
