import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import { estadoMock } from "@/features/bitacora/api/mock-bitacora"
import { bitacoraKeys } from "@/features/bitacora/api/query-keys"
import type { BitacoraCambio, BitacoraEstado } from "@/features/bitacora/api/types/bitacora"

/** Fila de `POST /sso-admin/audit/bitacora/estado`. */
interface EstadoRow {
  pk_tbitacora: string
  cambios: BitacoraCambio[] | null
  vista: string | null
  restauracion: { puede: "S" | "N"; motivo_bloqueo: string | null } | null
}

const toEstado = (row: EstadoRow): BitacoraEstado => ({
  id: row.pk_tbitacora,
  cambios: row.cambios ?? [],
  vista: row.vista,
  puede: row.restauracion?.puede === "S",
  motivoBloqueo: row.restauracion?.motivo_bloqueo ?? null,
})

async function fetchEstado(ids: string[], establecimiento: string): Promise<BitacoraEstado[]> {
  if (env.ENABLE_API_MOCKING) return estadoMock(ids)
  const response = await api.query<RowsEnvelope<EstadoRow>>("/sso-admin/audit/bitacora/estado", {
    IDS: ids,
    FK_ESTABLECIMIENTO: establecimiento || undefined,
  })
  return unwrapRows(response).map(toEstado)
}

/**
 * Lo que el listado de ClickHouse no trae, para los eventos de la página:
 * campos legibles con su valor actual, la vista dueña y si se puede restaurar.
 */
export function useBitacoraEstadoQuery(ids: string[], establecimiento: string) {
  return useQuery({
    queryKey: bitacoraKeys.estado(ids),
    queryFn: () => fetchEstado(ids, establecimiento),
    enabled: ids.length > 0,
    select: (rows) => new Map(rows.map((r) => [r.id, r])),
  })
}
