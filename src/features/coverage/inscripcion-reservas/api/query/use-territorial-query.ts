import { useQuery } from "@tanstack/react-query"

import { isNotFoundError } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"

import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { datos } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type {
  CalendarioCobertura,
  ContextoTerritorial,
  CupoContratadoGrupo,
  EnRedistribucion,
  OpcionUbicacion,
  Orientacion,
  Paginado,
  ProyeccionDetalle,
  ProyeccionEstablecimiento,
  SeguimientoDetalle,
  SeguimientoEstablecimiento,
  SolicitudRetiro,
  UbicadoSinGrupo,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"

export const TERRITORIAL_BASE = "/cobertura-academica/entidad-territorial"

const all = ["entidad-territorial"] as const

export const territorialKeys = {
  all,
  contexto: [...all, "contexto"] as const,
  proyeccion: [...all, "proyeccion"] as const,
  proyeccionDetalle: (id: number | "none") => [...all, "proyeccion", id] as const,
  calendarios: [...all, "calendarios"] as const,
  seguimiento: [...all, "seguimiento"] as const,
  seguimientoDetalle: (id: number | "none") => [...all, "seguimiento", id] as const,
  redistribucion: [...all, "redistribucion"] as const,
  redistribucionLista: <P>(params: P) => [...all, "redistribucion", "lista", params] as const,
  opcionesUbicacion: (id: number | "none") => [...all, "redistribucion", id, "opciones"] as const,
  ubicados: [...all, "ubicados"] as const,
  cuposContratados: [...all, "cupos-contratados"] as const,
  cuposContratadosLista: <P>(params: P) => [...all, "cupos-contratados", "lista", params] as const,
  orientaciones: [...all, "orientaciones"] as const,
  solicitudesRetiro: [...all, "solicitudes-retiro"] as const,
}

/**
 * Lista de Valores del tema de una orientación (3.10; sso V430). La administra Configuración › Lista de
 * valores; la orientación guarda el `pk_lista_valor` (FK_TLV_TEMA).
 */
export const LISTA_TEMAS_ORIENTACION = "TEMA_ORIENTACION_TERRITORIAL"

export interface TemaOrientacion {
  /** `pk_lista_valor`: lo que viaja como FK_TLV_TEMA. */
  value: number
  label: string
  /** Código estable del valor (COBERTURA, PERMANENCIA…): el sistema preselecciona por él. */
  valor: string
}

/** Temas habilitados, en el orden de la lista. */
export function useTemasOrientacionQuery() {
  return useQuery({
    ...selectCategoryQueryOptions(LISTA_TEMAS_ORIENTACION),
    select: (rows): TemaOrientacion[] => rows.map((r) => ({ value: r.pk_lista_valor, label: r.nombre, valor: r.valor })),
  })
}

/**
 * Tema que preselecciona el sistema por su código: Cobertura en Seguimiento y Redistribución, Permanencia en
 * Fuera de matrícula (sso los siembra ES_SISTEMA: se renombran, no se inactivan). 0 si la lista no lo trae.
 */
export function temaPorValor(temas: TemaOrientacion[] | undefined, valor: "COBERTURA" | "PERMANENCIA") {
  return temas?.find((t) => t.valor === valor)?.value ?? 0
}

export async function fetchContextoTerritorial() {
  try {
    return datos(
      await evalCol.getRow<{ datos: ContextoTerritorial | null }>(
        `${TERRITORIAL_BASE}/contexto`,
      ),
    )
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    if (isNotFoundError(e) || status === 403) return null
    throw e
  }
}

/** Rol territorial del usuario y sus establecimientos; null si no es territorial (la pestaña no se muestra). */
export function useContextoTerritorialQuery() {
  return useQuery({
    queryKey: territorialKeys.contexto,
    // Solo un 403/404 (no es territorial o el endpoint aún no existe) oculta la pestaña; un fallo
    // de red o un 500 quedan como error para que se reintente y no escondan la pestaña en caché.
    queryFn: fetchContextoTerritorial,
    staleTime: Infinity,
  })
}

export async function fetchProyeccion() {
  return datos(
    await evalCol.getRow<{ datos: ProyeccionEstablecimiento[] }>(
      `${TERRITORIAL_BASE}/proyeccion`,
    ),
  )
}

export function useProyeccionQuery() {
  return useQuery({
    queryKey: territorialKeys.proyeccion,
    queryFn: fetchProyeccion,
  })
}

export async function fetchProyeccionDetalle(id: number) {
  return datos(
    await evalCol.getRow<{ datos: ProyeccionDetalle }>(`${TERRITORIAL_BASE}/proyeccion/${id}`),
  )
}

export function useProyeccionDetalleQuery(id: number | undefined) {
  return useQuery({
    queryKey: territorialKeys.proyeccionDetalle(id ?? "none"),
    enabled: Boolean(id),
    queryFn: () => fetchProyeccionDetalle(id as number),
  })
}

export async function fetchCalendariosCobertura() {
  return datos(
    await evalCol.getRow<{ datos: CalendarioCobertura[] }>(`${TERRITORIAL_BASE}/calendarios`),
  )
}

export function useCalendariosQuery() {
  return useQuery({
    queryKey: territorialKeys.calendarios,
    queryFn: fetchCalendariosCobertura,
  })
}

export async function fetchSeguimiento() {
  return datos(
    await evalCol.getRow<{ datos: SeguimientoEstablecimiento[] }>(
      `${TERRITORIAL_BASE}/seguimiento`,
    ),
  )
}

export function useSeguimientoQuery() {
  return useQuery({
    queryKey: territorialKeys.seguimiento,
    queryFn: fetchSeguimiento,
  })
}

export async function fetchSeguimientoDetalle(establecimientoId: number) {
  return datos(
    await evalCol.getRow<{ datos: SeguimientoDetalle }>(
      `${TERRITORIAL_BASE}/seguimiento/${establecimientoId}`,
    ),
  )
}

export function useSeguimientoDetalleQuery(establecimientoId: number | undefined) {
  return useQuery({
    queryKey: territorialKeys.seguimientoDetalle(establecimientoId ?? "none"),
    enabled: Boolean(establecimientoId),
    queryFn: () => fetchSeguimientoDetalle(establecimientoId as number),
  })
}

/** Página en el back: sin `pageSize` devuelve todas las filas (exportar). Los vacíos no se envían. */
const cuerpoPagina = (filters: Record<string, unknown>, p: { pageIndex?: number; pageSize?: number }) => ({
  FILTERS: Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== "")),
  ...(p.pageSize ? { PAGEINDEX: p.pageIndex ?? 0, PAGESIZE: p.pageSize } : {}),
})

export interface RedistribucionParams {
  q?: string
  /** "S" o "N": dentro del área de influencia. */
  area?: string
  /** Una sola inscripción (Ver). */
  id?: number
  pageIndex?: number
  pageSize?: number
}

export async function fetchRedistribucion(p: RedistribucionParams = {}) {
  return datos(
    await evalCol.postRow<{ datos: Paginado<EnRedistribucion> }>(
      `${TERRITORIAL_BASE}/consulta/redistribucion`,
      cuerpoPagina({ SEARCH: p.q, AREA: p.area, ID: p.id }, p),
    ),
  )
}

export function useRedistribucionQuery(params: RedistribucionParams = {}) {
  return useQuery({
    queryKey: territorialKeys.redistribucionLista(params),
    queryFn: () => fetchRedistribucion(params),
    placeholderData: (prev) => prev,
  })
}

export function useOpcionesUbicacionQuery(inscripcionId: number | undefined) {
  return useQuery({
    queryKey: territorialKeys.opcionesUbicacion(inscripcionId ?? "none"),
    enabled: Boolean(inscripcionId),
    queryFn: async () =>
      datos(
        await evalCol.getRow<{ datos: OpcionUbicacion[] }>(
          `${TERRITORIAL_BASE}/redistribucion/${inscripcionId}/opciones`,
        ),
      ),
  })
}

export async function fetchUbicados() {
  return datos(await evalCol.getRow<{ datos: UbicadoSinGrupo[] }>(`${TERRITORIAL_BASE}/ubicados`))
}

export function useUbicadosQuery() {
  return useQuery({
    queryKey: territorialKeys.ubicados,
    queryFn: fetchUbicados,
  })
}

export interface CuposContratadosParams {
  q?: string
  establecimientoId?: number
  pageIndex?: number
  pageSize?: number
}

export async function fetchCuposContratados(params: CuposContratadosParams = {}) {
  return datos(
    await evalCol.postRow<{ datos: Paginado<CupoContratadoGrupo> }>(
      `${TERRITORIAL_BASE}/consulta/cupos-contratados`,
      cuerpoPagina({ SEARCH: params.q, FK_ESTABLECIMIENTO: params.establecimientoId }, params),
    ),
  )
}

export function useCuposContratadosQuery(params: CuposContratadosParams = {}) {
  return useQuery({
    queryKey: territorialKeys.cuposContratadosLista(params),
    queryFn: () => fetchCuposContratados(params),
    placeholderData: (prev) => prev,
  })
}

export async function fetchOrientaciones() {
  return datos(await evalCol.getRow<{ datos: Orientacion[] }>(`${TERRITORIAL_BASE}/orientaciones`))
}

export function useOrientacionesQuery() {
  return useQuery({
    queryKey: territorialKeys.orientaciones,
    queryFn: fetchOrientaciones,
  })
}

export async function fetchSolicitudesRetiro() {
  return datos(
    await evalCol.getRow<{ datos: SolicitudRetiro[] }>(
      `${TERRITORIAL_BASE}/solicitudes-retiro`,
    ),
  )
}

export function useSolicitudesRetiroQuery() {
  return useQuery({
    queryKey: territorialKeys.solicitudesRetiro,
    queryFn: fetchSolicitudesRetiro,
  })
}
