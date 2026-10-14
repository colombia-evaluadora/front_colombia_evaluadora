import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { SedeOption, SedesOptionsResponse } from "@/features/establishment/academic-period/api/types/sede-option"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { proveedorMeta } from "@/lib/offline/query-meta"

export async function fetchSedesOpciones(): Promise<SedeOption[]> {
  const raw: SedesOptionsResponse = await api.get("/eval-col/planeador/sedes/opciones")
  return raw.rows ?? []
}

export function useSedesOpcionesQuery() {
  return useQuery({
    // Endpoint del planeador: la key vive en su factory (`["planeador","sedes","opciones"]`).
    meta: proveedorMeta(),
    queryKey: planeadorKeys.sedesOpciones(),
    queryFn: fetchSedesOpciones,
    staleTime: 0,
  })
}
