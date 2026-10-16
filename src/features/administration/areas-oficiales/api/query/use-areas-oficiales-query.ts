import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { areaOficialKeys } from "@/features/administration/areas-oficiales/api/query-keys"
import type {
  AreaOficial,
  Resultado,
} from "@/features/administration/areas-oficiales/api/types/area-oficial"

// El catálogo entero (≈100 filas): búsqueda, filtros, orden y página se
// resuelven en el front, como en Listas de valor. Así también se distingue
// "catálogo vacío" de "nada coincide" sin otra consulta. El endpoint acepta
// ?BUSCAR=&NIVEL=&HABILITADA= si algún día hace falta filtrar en el back.
async function fetchAreasOficiales() {
  const [row] = await evalCol.getRows<Resultado<AreaOficial[]>>("/areas-oficiales")
  return row?.resultado ?? []
}

export function useAreasOficialesQuery() {
  return useQuery({ queryKey: areaOficialKeys.lista, queryFn: fetchAreasOficiales })
}
