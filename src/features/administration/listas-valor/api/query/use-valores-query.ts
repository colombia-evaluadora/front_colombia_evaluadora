import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  ListaValor,
  Resultado,
} from "@/features/administration/listas-valor/api/types/lista-valor"

// El backend exige al menos un filtro (CATEGORIA o PADRE): sin categoría no se consulta.
async function fetchValores(categoria: string) {
  const [row] = await evalCol.getRows<Resultado<ListaValor[]>>(
    `/listas-valor?CATEGORIA=${encodeURIComponent(categoria)}`,
  )
  return row?.resultado ?? []
}

export function useValoresQuery(categoria: string | null) {
  return useQuery({
    queryKey: listaValorKeys.valores(categoria ?? "none"),
    queryFn: () => fetchValores(categoria ?? ""),
    enabled: Boolean(categoria),
  })
}
