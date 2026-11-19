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
  opciones: [...all, "opciones"] as const,
  reprobados: (p: unknown) => [...all, "reprobados", p] as const,
  areasDelAnio: (id: number) => [...all, "reprobados", id, "areas"] as const,
  previa: (ids: number[]) => [...all, "previa", ids] as const,
  pendientes: (p: unknown) => [...all, "pendientes", p] as const,
  detalle: (id: number) => [...all, "pendientes", "detalle", id] as const,
}

const nulo = (v: string | undefined) => (v ? Number(v) : null)

export function useOpcionesPromocionQuery() {
  return useQuery({
    queryKey: promocionKeys.opciones,
    queryFn: async () => camelizar<OpcionesPromocion>(await evalCol.getRow(`${BASE}/opciones`)),
    staleTime: 5 * 60_000,
  })
}

/** Filtros de cada pestaña; los reusa el export (mismos que la tabla). */
export const filtrosReprobados = (s: PromocionSearch) => ({
  SEARCH: s.q || null,
  ANIO: s.anio ?? null,
  PERIODO: nulo(s.periodo),
  SEDE: nulo(s.sede),
  JORNADA: nulo(s.jornada),
  GRADO: nulo(s.grado),
  GRUPO: nulo(s.grupo),
})

export const filtrosPendientes = (s: PromocionSearch) => ({
  SEARCH: s.q || null,
  ANIO: s.anio ?? null,
  SEDE: nulo(s.sede),
  JORNADA: nulo(s.jornada),
  SEGUIMIENTO: s.seguimiento ?? null,
})

type Pagina = { pageIndex: number; pageSize: number }

export function useReprobadosQuery(s: PromocionSearch, p: Pagina) {
  const body = { ...filtrosReprobados(s), PAGE_INDEX: p.pageIndex, PAGE_SIZE: p.pageSize }
  return useQuery({
    queryKey: promocionKeys.reprobados(body),
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/reprobados/query`, body)
      return toPaginated(rows, { pageSize: p.pageSize, map: (r) => camelizar<Reprobado>(r) })
    },
    placeholderData: keepPreviousData,
  })
}

export function useAreasDelAnioQuery(matriculaId: number) {
  return useQuery({
    queryKey: promocionKeys.areasDelAnio(matriculaId),
    queryFn: async () => camelizar<AreaDelAnio[]>(await evalCol.getRows(`${BASE}/reprobados/${matriculaId}/areas`)),
  })
}

export function usePreviaPromoverQuery(ids: number[]) {
  return useQuery({
    queryKey: promocionKeys.previa(ids),
    queryFn: async () => camelizar<PreviaPromover[]>(await evalCol.postRows(`${BASE}/promover/previa`, { IDS: ids })),
    staleTime: 0,
  })
}

export function usePendientesQuery(s: PromocionSearch, p: Pagina) {
  const body = { ...filtrosPendientes(s), PAGE_INDEX: p.pageIndex, PAGE_SIZE: p.pageSize }
  return useQuery({
    queryKey: promocionKeys.pendientes(body),
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/pendientes/query`, body)
      return toPaginated(rows, { pageSize: p.pageSize, map: (r) => camelizar<Promovido>(r) })
    },
    placeholderData: keepPreviousData,
  })
}

export function useDetallePromocionQuery(promocionId: number) {
  return useQuery({
    queryKey: promocionKeys.detalle(promocionId),
    queryFn: async () => camelizar<DetallePromocion>(await evalCol.getRow(`${BASE}/pendientes/${promocionId}`)),
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
