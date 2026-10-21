import { useQuery } from "@tanstack/react-query"

import type { Jornada } from "../types/jornada"
import { fetchSelectCategory } from "./fetch-select-category"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { proveedorMeta } from "@/lib/offline/query-meta"

// Catálogo genérico de TLISTA_VALOR (`GET /eval-col/select/JORNADA`).
export async function fetchJornadas(): Promise<Jornada[]> {
  const rows = await fetchSelectCategory("JORNADA")
  return rows.map((row) => ({ id: row.pk_lista_valor, name: row.nombre }))
}

export function useJornadasQuery() {
  return useQuery({
    meta: proveedorMeta(),
    queryKey: academicPeriodKeys.jornadas(),
    queryFn: fetchJornadas,
    staleTime: Infinity,
  })
}
