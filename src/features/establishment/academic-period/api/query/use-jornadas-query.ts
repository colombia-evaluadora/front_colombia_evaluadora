import { useQuery } from "@tanstack/react-query"

import type { Jornada } from "../types/jornada"
import { fetchSelectCategory } from "./fetch-select-category"

// Catálogo genérico de TLISTA_VALOR (`GET /eval-col/select/JORNADA`).
async function fetchJornadas(): Promise<Jornada[]> {
  const rows = await fetchSelectCategory("JORNADA")
  return rows.map((row) => ({ id: row.pk_lista_valor, name: row.nombre }))
}

export const jornadasQueryKey = () => ["jornadas"]

export function useJornadasQuery() {
  return useQuery({
    queryKey: jornadasQueryKey(),
    queryFn: fetchJornadas,
    staleTime: Infinity,
  })
}
