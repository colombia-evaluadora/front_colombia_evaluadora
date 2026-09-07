import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { SedeOption, SedesOptionsResponse } from "../types/sede-option"

// `GET /eval-col/establecimientos/sedes/opciones`. Alimenta el select de Sede
// del form de periodo académico. El backend filtra por alcance/establecimiento
// (TROL 1/2/3 vs 7/8/9); el front no agrega filtro.
//
// Migrado desde `useCampusesOptionsQuery` (`/establishments/campuses/options`,
// legacy). El otro consumidor de ese hook legacy es el dialog de permisos de
// funcionarios (`dialog-manage.tsx`), que se queda en el endpoint viejo por
// ahora — no se toca UI fuera del módulo.
export async function fetchSedeOptions(): Promise<SedeOption[]> {
  const raw: SedesOptionsResponse = await api.get(
    "/eval-col/establecimientos/sedes/opciones",
  )
  return raw.rows ?? []
}

export const sedeOptionsQueryKey = ["sedes", "options"] as const

export function useSedeOptionsQuery() {
  return useQuery({
    queryKey: sedeOptionsQueryKey,
    queryFn: fetchSedeOptions,
    staleTime: 0,
  })
}
