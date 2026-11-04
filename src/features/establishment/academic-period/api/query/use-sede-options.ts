import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { SedeOption, SedesOptionsResponse } from "../types/sede-option"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { proveedorMeta } from "@/lib/offline/query-meta"

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

/**
 * Sedes que admiten registros nuevos (Regla 100): las Activas, más la ya
 * elegida (`actual`) aunque se haya inactivado, para que un registro guardado
 * siga mostrando su sede al editarlo. Los filtros y las vistas de consulta usan
 * la lista completa: la información de una sede inactiva sigue visible.
 */
export function sedesParaRegistroNuevo<T extends { pk_sede: number; estado?: string }>(
  sedes: T[],
  actual?: number | string | null,
): T[] {
  return sedes.filter((sede) => sede.estado !== "I" || (actual != null && String(sede.pk_sede) === String(actual)))
}

export function useSedeOptionsQuery() {
  return useQuery({
    meta: proveedorMeta(),
    queryKey: academicPeriodKeys.sedeOptions(),
    queryFn: fetchSedeOptions,
    staleTime: 0,
  })
}
