import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  Categoria,
  Resultado,
} from "@/features/administration/listas-valor/api/types/lista-valor"

async function fetchCategorias() {
  const [row] = await evalCol.getRows<Resultado<Categoria[]>>("/listas-valor/categorias")
  return row?.resultado ?? []
}

export function useCategoriasQuery() {
  return useQuery({ queryKey: listaValorKeys.categorias, queryFn: fetchCategorias })
}
