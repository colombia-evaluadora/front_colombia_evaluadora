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

// Mismo criterio que el catálogo de grados (`use-grados-catalog.ts`): el back
// no lo devuelve en orden pedagógico, pero `codigo` sí sigue esa secuencia
// (Preescolar, Básica Primaria, Básica Secundaria, Media, ...).
const teachingLevelOrderCollator = new Intl.Collator("es", { numeric: true })

// `GET /eval-col/niveles-ensenanza` (`fn_nivel_ensenanza_listar`, id_query
// 67) — catálogo global, sin scoping por periodo. `grados` (opcional en el
// tipo) no lo devuelve esta función; queda sin poblar.
export async function fetchTeachingLevels(): Promise<TeachingLevel[]> {
  const raw: TeachingLevelsResponse = await api.get("/eval-col/niveles-ensenanza")
  return (raw.rows ?? [])
    .slice()
    .sort((a, b) => teachingLevelOrderCollator.compare(a.codigo, b.codigo))
    .map((row) => ({ id: row.id, nombre: row.nombre }))
}

export const teachingLevelsQueryKey = () => ["teaching-levels"]

export function useTeachingLevelsQuery() {
  return useQuery({
    queryKey: teachingLevelsQueryKey(),
    queryFn: fetchTeachingLevels,
    staleTime: Infinity,
  })
}
