import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

export interface MomentoRegistroOption {
  id: number
  nombre: string
}

// Catálogo `MOMENTO_REGISTRO` de TLISTA_VALOR (`GET /eval-col/select/MOMENTO_REGISTRO`).
async function fetchMomentosRegistro(): Promise<MomentoRegistroOption[]> {
  const rows = await fetchSelectCategory("MOMENTO_REGISTRO")
  return rows.map((row) => ({ id: row.pk_lista_valor, nombre: row.nombre }))
}

export function useMomentoRegistroCatalog() {
  return useQuery({
    queryKey: planeadorKeys.catalogos.momentoRegistro(),
    queryFn: fetchMomentosRegistro,
    staleTime: Infinity,
  })
}
