import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { GeneralArea } from "@/features/establishment/academic-period/api/types/general-area"

interface GeneralAreaRow {
  id: number
  nombre: string
  especialidad_id: number
}

interface GeneralAreasResponse {
  rows: GeneralAreaRow[]
}

async function fetchGeneralAreas(): Promise<GeneralArea[]> {
  const raw: GeneralAreasResponse = await api.get("/eval-col/areas/general")
  return (raw.rows ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    especialidadId: row.especialidad_id,
  }))
}

export const generalAreasQueryKey = () => ["general-areas"]

export function useGeneralAreasQuery() {
  return useQuery({
    queryKey: generalAreasQueryKey(),
    queryFn: fetchGeneralAreas,
    staleTime: Infinity,
  })
}
