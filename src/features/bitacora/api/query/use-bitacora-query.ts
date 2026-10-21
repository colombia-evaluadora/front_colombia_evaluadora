import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { SortingState } from "@tanstack/react-table"
import { endOfDay, startOfDay } from "date-fns"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX } from "@/lib/api-routes"
import { parseDateValue } from "@/lib/date-value"
import { toPageCount } from "@/lib/pagination"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import { eventosMock } from "@/features/bitacora/api/mock-bitacora"
import { bitacoraKeys } from "@/features/bitacora/api/query-keys"
import {
  moduloConSedeJornada,
  type BitacoraAccion,
  type BitacoraEvento,
  type BitacoraPagina,
  type EventoPosterior,
  type TipoRestauracion,
} from "@/features/bitacora/api/types/bitacora"
import type { BitacoraFilters } from "@/features/bitacora/hooks/use-bitacora-filters"

export interface BitacoraParams {
  filters: BitacoraFilters
  sorting: SortingState
  pageIndex: number
  pageSize: number
}

/** Fila de `POST /audit-cval/bitacora/query` (V571). */
interface BitacoraRow {
  pk_tbitacora: string
  fecha: string
  usuario_nombre: string
  usuario_documento: string | null
  usuario_rol: string | null
  es_sistema: "S" | "N"
  sede: string | null
  jornada: string | null
  entidad: string
  registro: string
  accion: BitacoraAccion
  descripcion: string | null
  campos: string[] | null
  motivo: string | null
  tipo_restauracion: TipoRestauracion | null
  motivo_bloqueo_evento: string | null
  vigente: "S" | "N"
  eventos_posteriores: EventoPosterior[] | null
  total_count: number | string
}

const toEvento = (row: BitacoraRow): BitacoraEvento => ({
  id: row.pk_tbitacora,
  // Viene en hora de Colombia, sin zona.
  fecha: new Date(`${row.fecha}-05:00`),
  usuario: { nombre: row.usuario_nombre, documento: row.usuario_documento, rol: row.usuario_rol },
  esSistema: row.es_sistema === "S",
  sede: row.sede,
  jornada: row.jornada,
  entidad: row.entidad,
  registro: row.registro,
  accion: row.accion,
  descripcion: row.descripcion ?? null,
  campos: row.campos ?? [],
  motivo: row.motivo,
  tipoRestauracion: row.tipo_restauracion,
  motivoBloqueoEvento: row.motivo_bloqueo_evento,
  vigente: row.vigente === "S",
  eventosPosteriores: row.eventos_posteriores ?? [],
})

/** Filtros con los nombres del back. Exportado: lo reusa la exportación. */
export function toBitacoraFilters(f: BitacoraFilters) {
  return {
    MODULO: f.modulo,
    // Solo cuenta para el Superadministrador; a los demás el back los fija en el suyo.
    FK_ESTABLECIMIENTO: f.modulo === "ADMINISTRACION" ? undefined : f.establecimiento || undefined,
    // Comunicaciones no tiene sede: una sede de otro módulo que quede en la URL no debe vaciar el listado.
    FK_SEDE: moduloConSedeJornada(f.modulo) ? f.sede || undefined : undefined,
    FK_JORNADA: moduloConSedeJornada(f.modulo) ? f.jornada || undefined : undefined,
    ENTIDAD: f.entidad || undefined,
    // El back extrae los códigos de un texto (`extractAll`).
    ACCIONES: f.accion.length ? f.accion.join(",") : undefined,
    BUSQUEDA: f.q.trim().length >= 3 ? f.q.trim() : undefined,
    DESDE: f.desde,
    HASTA: f.hasta,
  }
}

export function toBitacoraSorting(sorting: SortingState) {
  const [orden] = sorting
  return orden ? { id: orden.id, desc: orden.desc } : { id: "fecha", desc: true }
}

async function fetchBitacora(params: BitacoraParams): Promise<BitacoraPagina> {
  if (env.ENABLE_API_MOCKING) return fetchBitacoraMock(params)

  const response = await api.query<RowsEnvelope<BitacoraRow>>(`${AUDIT_API_PREFIX}/bitacora/query`, {
    filters: toBitacoraFilters(params.filters),
    sorting: toBitacoraSorting(params.sorting),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  })
  const rows = unwrapRows(response)
  const totalCount = Number(rows[0]?.total_count ?? 0)
  return { rows: rows.map(toEvento), totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
}

export function useBitacoraQuery(params: BitacoraParams, enabled = true) {
  return useQuery({
    queryKey: bitacoraKeys.lista(params),
    queryFn: () => fetchBitacora(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

// --- Mock -----------------------------------------------------------------

const normalizar = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

async function fetchBitacoraMock({ filters: f, sorting, pageIndex, pageSize }: BitacoraParams) {
  await new Promise((r) => setTimeout(r, 250))
  const q = normalizar(f.q.trim())
  const desde = parseDateValue(f.desde)
  const hasta = parseDateValue(f.hasta)
  const filtrados = eventosMock(f.modulo)
    .map((m) => m.evento)
    .filter(
      (e) =>
        (!q || normalizar(`${e.usuario.nombre} ${e.usuario.documento ?? ""}`).includes(q)) &&
        (!f.accion.length || f.accion.includes(e.accion)) &&
        (!desde || e.fecha >= startOfDay(desde)) &&
        (!hasta || e.fecha <= endOfDay(hasta)),
    )
  const { id, desc } = toBitacoraSorting(sorting)
  const valor = (e: BitacoraEvento) =>
    id === "usuario" ? e.usuario.nombre : id === "sede" ? (e.sede ?? "") : id === "accion" ? e.accion : id === "entidad" ? e.entidad : e.fecha.toISOString()
  const ordenados = [...filtrados].sort((a, b) => (desc ? -1 : 1) * valor(a).localeCompare(valor(b), "es"))
  return {
    rows: ordenados.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    totalCount: ordenados.length,
    pageCount: toPageCount(ordenados.length, pageSize),
  }
}
