import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { festivoKeys } from "@/features/administration/festivos/api/query-keys"
import type { Festivo, Resultado } from "@/features/administration/festivos/api/types"

// La lista entera (una veintena de filas): búsqueda, filtros, orden y página se
// resuelven en el front, como en Áreas oficiales. El endpoint acepta
// ?BUSCAR=&HABILITADO= si algún día hace falta filtrar en el back.
async function fetchFestivos() {
  const [row] = await evalCol.getRows<Resultado<Festivo[]>>("/festivos")
  return row?.resultado ?? []
}

export function useFestivosQuery() {
  return useQuery({ queryKey: festivoKeys.lista, queryFn: fetchFestivos })
}
