import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  GestionAlertaDetalle,
  GestionAlertaRow,
  GestionAlertasFiltros,
  GestionAlertasQueryFilters,
  OpcionesGestionAlertas,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export const BASE_GESTION_ALERTAS = `${BASE_PREVENCION}/gestion-alertas`

/** Valor del filtro Responsable que pide las gestiones Sin responsable. */
export const RESPONSABLE_SIN = "SIN"

export function toGestionAlertasFilters(
  establecimiento: number,
  verTodas: boolean,
  search: string,
  f: GestionAlertasFiltros,
): GestionAlertasQueryFilters {
  const sin = f.responsable === RESPONSABLE_SIN
  return {
    ESTABLECIMIENTO: establecimiento,
    ESTADO: f.estado || null,
    UMBRAL: f.umbral || null,
    GRUPO: f.grupo ? Number(f.grupo) : null,
    RESPONSABLE: f.responsable && !sin ? Number(f.responsable) : null,
    SIN_RESPONSABLE: sin || null,
    VER_TODAS: verTodas,
    SEARCH: search.trim() || null,
  }
}

export interface GestionAlertasParams {
  filters: GestionAlertasQueryFilters | null
  pageIndex: number
  pageSize: number
}

export const fetchGestionAlertas = async (params: GestionAlertasParams) => {
  const rows = await evalCol.getRows<GestionAlertaRow>(
    `${BASE_GESTION_ALERTAS}${queryString({ ...params.filters, PAGEINDEX: params.pageIndex, PAGESIZE: params.pageSize })}`,
  )
  const totalCount = Number(rows[0]?.total_count ?? 0)
  return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
}

/** `GET /gestion-alertas`: sin ESTADO excluye las Resueltas; sin VER_TODAS, las del usuario y las Sin responsable de su sede. */
export function useGestionAlertasQuery(params: GestionAlertasParams) {
  return useQuery({
    queryKey: prevencionKeys.gestionAlertas(params),
    queryFn: () => fetchGestionAlertas(params),
    enabled: params.filters != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

export const fetchGestionAlerta = (gestionId: number | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE_GESTION_ALERTAS}/${gestionId}`)
    .then((r) => desenvolver<GestionAlertaDetalle>(r[0], "datos", "No se encontró la gestión de la alerta."))

/** `GET /gestion-alertas/:ID` → `datos`. */
export function useGestionAlertaQuery(gestionId: number | undefined) {
  return useQuery({
    queryKey: prevencionKeys.gestionAlerta(gestionId ?? "none"),
    queryFn: () => fetchGestionAlerta(gestionId),
    enabled: gestionId != null,
    retry: false,
  })
}

export const fetchOpcionesGestionAlertas = (establecimiento: number | null) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE_GESTION_ALERTAS}/opciones${queryString({ ESTABLECIMIENTO: establecimiento })}`)
    .then((r) => desenvolver<OpcionesGestionAlertas>(r[0], "datos", "No se pudieron cargar las opciones."))

/** `GET /gestion-alertas/opciones` → `datos`: todas las listas del módulo, con su etiqueta. */
export function useOpcionesGestionAlertasQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: prevencionKeys.opciones.gestionAlertas(establecimiento ?? "none"),
    queryFn: () => fetchOpcionesGestionAlertas(establecimiento),
    enabled: establecimiento != null,
    staleTime: 60_000,
  })
}

export const fetchGestionAlertasContador = () =>
  evalCol.getRows<{ contador: number }>(`${BASE_GESTION_ALERTAS}/contador`).then((r) => Number(r[0]?.contador ?? 0))

/** `GET /gestion-alertas/contador`: gestiones del usuario como Responsable, Pendientes o vencidas. */
export function useGestionAlertasContadorQuery(enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.gestionAlertasContador,
    queryFn: fetchGestionAlertasContador,
    enabled,
    staleTime: 30_000,
  })
}
