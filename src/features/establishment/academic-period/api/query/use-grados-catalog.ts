import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

// Catálogo global `GRADOS` de `TLISTA_VALOR` (`GET /eval-col/select/GRADOS`).
// `fn_grado_crear` valida el nombre del grado contra este catálogo (por
// NOMBRE o por VALOR) y deriva el CODIGO de ahí — no es un campo libre ni
// depende del nivel de enseñanza (a diferencia de lo que asumía el mock).
export interface GradoCatalogOption {
  id: number
  valor: string
  nombre: string
}

// El catálogo no viene ordenado pedagógicamente desde el back (orden de
// inserción en TLISTA_VALOR). `VALOR` es el que matchea el orden real de los
// grados (ver comentario de arriba) — se ordena con `numeric: true` para que
// "10"/"11" no queden antes de "2"/"9" (orden alfabético puro los rompería).
const gradoOrderCollator = new Intl.Collator("es", { numeric: true })

async function fetchGradosCatalog(): Promise<GradoCatalogOption[]> {
  const rows = await fetchSelectCategory("GRADOS")
  return rows
    .map((row) => ({
      id: row.pk_lista_valor,
      valor: row.valor,
      nombre: row.nombre,
    }))
    .sort((a, b) => gradoOrderCollator.compare(a.valor, b.valor))
}

export const gradosCatalogQueryKey = () => ["grados-catalog"]

export function useGradosCatalogQuery() {
  return useQuery({
    queryKey: gradosCatalogQueryKey(),
    queryFn: fetchGradosCatalog,
    staleTime: Infinity,
  })
}
