import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { SedeOption, SedesOptionsResponse } from "@/features/establishment/academic-period/api/types/sede-option"

async function fetchSedesOpciones(): Promise<SedeOption[]> {
  const raw: SedesOptionsResponse = await api.get("/eval-col/planeador/sedes/opciones")
  return raw.rows ?? []
}

export const sedesOpcionesQueryKey = ["planeador", "sedes", "opciones"] as const

export function useSedesOpcionesQuery() {
  return useQuery({
    queryKey: sedesOpcionesQueryKey,
    queryFn: fetchSedesOpciones,
    staleTime: 0,
  })
}
