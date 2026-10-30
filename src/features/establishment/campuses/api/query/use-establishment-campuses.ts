import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"

/** Fila de `fn_sed_por_establecimiento`: solo se usan id y nombre. */
interface RealEstablishmentCampusRow {
  pk_sede: number
  nombre: string
}

/** Sedes del establecimiento (`GET /establecimientos/:ID/sedes`): para advertir un nombre repetido. */
export async function fetchEstablishmentCampuses(establishmentId: number): Promise<{ id: number; name: string }[]> {
  const rows = await evalCol.getRows<RealEstablishmentCampusRow>(`/establecimientos/${establishmentId}/sedes`)
  return rows.map((row) => ({ id: row.pk_sede, name: row.nombre }))
}

export function useEstablishmentCampusesQuery(establishmentId: number | null) {
  return useQuery({
    queryKey: campusKeys.porEstablecimiento(establishmentId),
    queryFn: () => fetchEstablishmentCampuses(establishmentId as number),
    enabled: establishmentId != null,
  })
}

/** Siguiente consecutivo libre (2-99) del establecimiento para una sede nueva, o null si no queda. */
export async function fetchNextConsecutive(establishmentId: number): Promise<number | null> {
  const [row] = await evalCol.getRows<{ consecutivo: number | null }>(`/establecimientos/${establishmentId}/sedes/consecutivo`)
  return row?.consecutivo ?? null
}

export function useNextConsecutiveQuery(establishmentId: number | null) {
  return useQuery({
    queryKey: campusKeys.consecutivo(establishmentId),
    queryFn: () => fetchNextConsecutive(establishmentId as number),
    enabled: establishmentId != null,
    // Otra persona puede crear una sede mientras tanto: se pide al elegir el establecimiento.
    staleTime: 0,
  })
}
