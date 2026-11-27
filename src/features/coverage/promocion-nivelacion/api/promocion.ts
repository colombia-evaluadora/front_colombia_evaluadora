import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { toPaginated } from "@/lib/pagination"

import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type {
  AreaDelAnio,
  DetallePromocion,
  OpcionesPromocion,
  PreviaPromover,
  Promovido,
  Reprobado,
  ResultadoPromover,
} from "@/features/coverage/promocion-nivelacion/api/types"
import type { PromocionSearch } from "@/features/coverage/promocion-nivelacion/api/schema"

// Promoción y nivelación (Sección 4.7). Pendiente en el back
// (docs/matricula/pendientes-back.md, tarea 28).

export const MENU_PROMOCION = "PROMOCION_NIVELACION"
const BASE = "/cobertura-academica/promocion-nivelacion"

const all = ["promocion-nivelacion"] as const
export const promocionKeys = {
  all,
  establecimientos: [...all, "establecimientos"] as const,
  opciones: (ee: number | null) => [...all, "opciones", ee ?? "todos"] as const,
  reprobados: (p: unknown) => [...all, "reprobados", p] as const,
  areasDelAnio: (id: number) => [...all, "reprobados", id, "areas"] as const,
  previa: (ids: number[]) => [...all, "previa", ids] as const,
  pendientes: (p: unknown) => [...all, "pendientes", p] as const,
  detalle: (id: number) => [...all, "pendientes", "detalle", id] as const,
}

const nulo = (v: string | undefined) => (v ? Number(v) : null)

export async function fetchOpcionesPromocion(ee: number | null = null) {
  return camelizar<OpcionesPromocion>(await evalCol.getRow(`${BASE}/opciones${ee != null ? `?ESTABLECIMIENTO=${ee}` : ""}`))
}

/** Filtros del alcance; con establecimiento elegido, solo los suyos. */
export function useOpcionesPromocionQuery(ee: number | null) {
  return useQuery({
    queryKey: promocionKeys.opciones(ee),
    queryFn: () => fetchOpcionesPromocion(ee),
    staleTime: 5 * 60_000,
  })
}

export type EstablecimientoPromocion = { id: number; nombre: string }

export async function fetchEstablecimientosPromocion() {
  return evalCol.getRows<EstablecimientoPromocion>(`${BASE}/establecimientos`)
}

/** Establecimientos del alcance: el selector aparece solo con más de uno (roles territoriales). */
export function useEstablecimientosPromocionQuery() {
  return useQuery({
    queryKey: promocionKeys.establecimientos,
    queryFn: fetchEstablecimientosPromocion,
    staleTime: 10 * 60_000,
  })
}

type FiltrosPromocion = Omit<PromocionSearch, "tab" | "page" | "pageSize">

/** Filtros de cada pestaña; los reusa el export (mismos que la tabla). */
export const filtrosReprobados = (s: FiltrosPromocion) => ({
  ESTABLECIMIENTO: nulo(s.ee),
  SEARCH: s.q || null,
  ANIO: s.anio ?? null,
  PERIODO: nulo(s.periodo),
  SEDE: nulo(s.sede),
  JORNADA: nulo(s.jornada),
  GRADO: nulo(s.grado),
  GRUPO: nulo(s.grupo),
})

export const filtrosPendientes = (s: FiltrosPromocion) => ({
  ESTABLECIMIENTO: nulo(s.ee),
  SEARCH: s.q || null,
  ANIO: s.anio ?? null,
  SEDE: nulo(s.sede),
  JORNADA: nulo(s.jornada),
  GRADO: nulo(s.grado),
  SEGUIMIENTO: s.seguimiento ?? null,
})

type Pagina = { pageIndex: number; pageSize: number }

/** Body de la lista: es también su key. */
export const cuerpoReprobados = (s: FiltrosPromocion, p: Pagina) => ({
  ...filtrosReprobados(s),
  PAGE_INDEX: p.pageIndex,
  PAGE_SIZE: p.pageSize,
})

export async function fetchReprobados(body: ReturnType<typeof cuerpoReprobados>) {
  const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/reprobados/query`, body)
  return toPaginated(rows, { pageSize: body.PAGE_SIZE, map: (r) => camelizar<Reprobado>(r) })
}

export function useReprobadosQuery(s: PromocionSearch, p: Pagina) {
  const body = cuerpoReprobados(s, p)
  return useQuery({
    queryKey: promocionKeys.reprobados(body),
    queryFn: () => fetchReprobados(body),
    placeholderData: keepPreviousData,
  })
}

export async function fetchAreasDelAnio(matriculaId: number) {
  return camelizar<AreaDelAnio[]>(await evalCol.getRows(`${BASE}/reprobados/${matriculaId}/areas`))
}

export function useAreasDelAnioQuery(matriculaId: number) {
  return useQuery({
    queryKey: promocionKeys.areasDelAnio(matriculaId),
    queryFn: () => fetchAreasDelAnio(matriculaId),
  })
}

export function usePreviaPromoverQuery(ids: number[]) {
  return useQuery({
    queryKey: promocionKeys.previa(ids),
    queryFn: async () => camelizar<PreviaPromover[]>(await evalCol.postRows(`${BASE}/promover/previa`, { IDS: ids })),
    staleTime: 0,
  })
}

/** Body de la lista: es también su key. */
export const cuerpoPendientes = (s: FiltrosPromocion, p: Pagina) => ({
  ...filtrosPendientes(s),
  PAGE_INDEX: p.pageIndex,
  PAGE_SIZE: p.pageSize,
})

export async function fetchPendientes(body: ReturnType<typeof cuerpoPendientes>) {
  const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/pendientes/query`, body)
  return toPaginated(rows, { pageSize: body.PAGE_SIZE, map: (r) => camelizar<Promovido>(r) })
}

export function usePendientesQuery(s: PromocionSearch, p: Pagina) {
  const body = cuerpoPendientes(s, p)
  return useQuery({
    queryKey: promocionKeys.pendientes(body),
    queryFn: () => fetchPendientes(body),
    placeholderData: keepPreviousData,
  })
}

export async function fetchDetallePromocion(promocionId: number) {
  return camelizar<DetallePromocion>(await evalCol.getRow(`${BASE}/pendientes/${promocionId}`))
}

export function useDetallePromocionQuery(promocionId: number) {
  return useQuery({
    queryKey: promocionKeys.detalle(promocionId),
    queryFn: () => fetchDetallePromocion(promocionId),
  })
}

function useMutacion<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promocionKeys.all }),
  })
}

export interface PromoverInput {
  ids: number[]
  acta: string
  fechaActa: string
  plazo: string
  observacion: string | null
}

export const usePromover = () =>
  useMutacion(async (v: PromoverInput) =>
    camelizar<ResultadoPromover[]>(
      await evalCol.postRows(`${BASE}/promover`, {
        IDS: v.ids,
        ACTA: v.acta,
        FECHA_ACTA: v.fechaActa,
        PLAZO: v.plazo,
        OBSERVACION: v.observacion,
      }),
    ),
  )

export const useAnularPromocion = () =>
  useMutacion((v: { promocionId: number; motivo: string }) =>
    evalCol.putRow(`${BASE}/pendientes/${v.promocionId}/anular`, { MOTIVO: v.motivo }),
  )

export const useAmpliarPlazo = () =>
  useMutacion((v: { promocionId: number; plazo: string; motivo: string }) =>
    evalCol.putRow(`${BASE}/pendientes/${v.promocionId}/plazo`, { PLAZO: v.plazo, MOTIVO: v.motivo }),
  )

export interface RegistrarNivelacionInput {
  promocionId: number
  areaId: number
  fecha: string
  nota: number
  funcionarioId: number
  observacion: string | null
  soporte: File | null
}

/** Al guardar, el back crea la [Ejecución] de Nivelación de área pendiente en Gestión Académica. */
export const useRegistrarNivelacion = () =>
  useMutacion((v: RegistrarNivelacionInput) =>
    postMultipart(
      `/eval-col${BASE}/pendientes/${v.promocionId}/areas/${v.areaId}/nivelacion`,
      { FECHA: v.fecha, NOTA: v.nota, FK_TFUNCIONARIO: v.funcionarioId, OBSERVACION: v.observacion },
      { SOPORTE: v.soporte },
    ),
  )

/** Corrige el último intento del área: fecha y nota, con motivo. */
export const useCorregirNivelacion = () =>
  useMutacion((v: { promocionId: number; areaId: number; fecha: string; nota: number; motivo: string }) =>
    evalCol.putRow(`${BASE}/pendientes/${v.promocionId}/areas/${v.areaId}/nivelacion`, {
      FECHA: v.fecha,
      NOTA: v.nota,
      MOTIVO: v.motivo,
    }),
  )
