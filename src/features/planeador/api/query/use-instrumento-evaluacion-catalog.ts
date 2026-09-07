import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

// Catálogo global `INSTRUMENTO_EVALUACION` de `TLISTA_VALOR`
// (`GET /eval-col/select/INSTRUMENTO_EVALUACION`) — resuelve
// `FK_TLV_INSTRUMENTO_EVALUACION` (V226/V240, colección Postman
// `planeador-instrumentos`). Mismo patrón que `use-grados-catalog.ts`.
async function fetchInstrumentoEvaluacionCatalog(): Promise<string[]> {
  const rows = await fetchSelectCategory("INSTRUMENTO_EVALUACION")
  return rows.map((row) => row.nombre)
}

export const instrumentoEvaluacionCatalogQueryKey = () => ["instrumento-evaluacion-catalog"]

export function useInstrumentoEvaluacionCatalogQuery() {
  return useQuery({
    queryKey: instrumentoEvaluacionCatalogQueryKey(),
    queryFn: fetchInstrumentoEvaluacionCatalog,
    staleTime: Infinity,
  })
}
