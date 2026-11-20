import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { endOfDay, startOfDay } from "date-fns"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX } from "@/lib/api-routes"
import { parseDateValue } from "@/lib/date-value"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import { eventosMock } from "@/features/bitacora/api/mock-bitacora"
import { bitacoraKeys } from "@/features/bitacora/api/query-keys"
import { toBitacoraFilters } from "@/features/bitacora/api/query/use-bitacora-query"
import {
  BITACORA_ACCION_IDS,
  BITACORA_MODULO_IDS,
  type BitacoraAccion,
  type BitacoraModulo,
  type BitacoraResumenFila,
} from "@/features/bitacora/api/types/bitacora"
import type { BitacoraFilters } from "@/features/bitacora/hooks/use-bitacora-filters"

/** Fila de `POST /audit-cval/bitacora/resumen` (pendiente de backend): una por módulo y acción. */
interface ResumenRow {
  modulo: BitacoraModulo
  accion: BitacoraAccion
  cantidad: number | string
}

/**
 * Resumen por módulo (B.1.LIS.1a): mismos filtros que la consulta, salvo el módulo, porque la tabla los
 * recorre todos. El orden es el de los módulos y las acciones en la plataforma.
 */
async function fetchResumen(filters: BitacoraFilters): Promise<BitacoraResumenFila[]> {
  if (env.ENABLE_API_MOCKING) return resumenMock(filters)
  // El resumen recorre todos los módulos: se arma como uno con sede y jornada para no perder esos filtros
  // ni el establecimiento (Administración del Sistema los descarta) y se quita el módulo.
  const { MODULO: _modulo, ...filtros } = toBitacoraFilters({ ...filters, modulo: "ESTABLECIMIENTO", entidad: "" })
  const response = await api.query<RowsEnvelope<ResumenRow>>(`${AUDIT_API_PREFIX}/bitacora/resumen`, { filters: filtros })
  return ordenar(unwrapRows(response).map((r) => ({ modulo: r.modulo, accion: r.accion, cantidad: Number(r.cantidad) })))
}

const ordenar = (filas: BitacoraResumenFila[]) =>
  [...filas].sort(
    (a, b) =>
      BITACORA_MODULO_IDS.indexOf(a.modulo) - BITACORA_MODULO_IDS.indexOf(b.modulo) ||
      BITACORA_ACCION_IDS.indexOf(a.accion) - BITACORA_ACCION_IDS.indexOf(b.accion),
  )

export function useBitacoraResumenQuery(filters: BitacoraFilters, enabled = true) {
  return useQuery({
    queryKey: bitacoraKeys.resumen(filters),
    queryFn: () => fetchResumen(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

// --- Mock -----------------------------------------------------------------

async function resumenMock(f: BitacoraFilters): Promise<BitacoraResumenFila[]> {
  await new Promise((r) => setTimeout(r, 250))
  const desde = parseDateValue(f.desde)
  const hasta = parseDateValue(f.hasta)
  const filas: BitacoraResumenFila[] = []
  for (const modulo of BITACORA_MODULO_IDS) {
    const cuenta = new Map<BitacoraAccion, number>()
    for (const { evento: e } of eventosMock(modulo)) {
      if (f.accion.length && !f.accion.includes(e.accion)) continue
      if (desde && e.fecha < startOfDay(desde)) continue
      if (hasta && e.fecha > endOfDay(hasta)) continue
      cuenta.set(e.accion, (cuenta.get(e.accion) ?? 0) + 1)
    }
    for (const [accion, cantidad] of cuenta) filas.push({ modulo, accion, cantidad })
  }
  return ordenar(filas)
}
