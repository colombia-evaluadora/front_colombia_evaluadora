import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { actividadesKeys } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query-keys"
import type {
  ActividadDetalle,
  ActividadesFiltros,
  ActividadesQueryFilters,
  ActividadRow,
  CandidatoRow,
  OpcionResponsable,
  ParticipanteRow,
  SesionDetalle,
  SesionRow,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

export const BASE_ACTIVIDADES = "/gestion-estudiantil/actividades"

const id = (value: string) => (value ? Number(value) : null)

export function toActividadesFilters(search: string, f: ActividadesFiltros): ActividadesQueryFilters {
  return {
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    TIPO: id(f.tipo),
    RESPONSABLE: id(f.responsable),
    ESTADO: f.estado || null,
    SEARCH: search.trim() || null,
  }
}

export interface PaginaParams<F> {
  filters: F | null
  pageIndex: number
  pageSize: number
}

/** `GET /actividades`: paginado en el servidor; `total_count` viene repetido en cada fila. */
export function useActividadesQuery(params: PaginaParams<ActividadesQueryFilters>) {
  return useQuery({
    queryKey: actividadesKeys.lista(params),
    queryFn: async () => {
      const rows = await evalCol.getRows<ActividadRow>(
        `${BASE_ACTIVIDADES}${queryString({ ...params.filters, PAGEINDEX: params.pageIndex, PAGESIZE: params.pageSize })}`,
      )
      const totalCount = Number(rows[0]?.total_count ?? 0)
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    enabled: params.filters != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

/** `GET /actividades/:ID` → columna `datos`. */
export function useActividadQuery(actividadId: number | undefined) {
  return useQuery({
    queryKey: actividadesKeys.detalle(actividadId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_ACTIVIDADES}/${actividadId}`)
        .then((r) => desenvolver<ActividadDetalle>(r[0], "datos", "No se encontró la actividad.")),
    enabled: actividadId != null,
    retry: false,
  })
}

/** `GET /actividades/responsables`: exige sede y jornada. */
export function useResponsablesQuery(sede: number | null, jornada: number | null, search = "", enabled = true) {
  return useQuery({
    queryKey: actividadesKeys.responsables(sede ?? "none", jornada ?? "none", search),
    queryFn: () =>
      evalCol.getRows<OpcionResponsable>(
        `${BASE_ACTIVIDADES}/responsables${queryString({ SEDE: sede, JORNADA: jornada, SEARCH: search.trim() || null })}`,
      ),
    enabled: enabled && sede != null && jornada != null,
    retry: false,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export interface ParticipantesParams {
  search?: string
  estado?: string
  pageIndex: number
  pageSize: number
}

/** `GET /actividades/:ID/participantes`. */
export function useParticipantesQuery(actividadId: number | undefined, params: ParticipantesParams) {
  return useQuery({
    queryKey: actividadesKeys.participantes(actividadId ?? "none", params),
    queryFn: async () => {
      const rows = await evalCol.getRows<ParticipanteRow>(
        `${BASE_ACTIVIDADES}/${actividadId}/participantes${queryString({
          SEARCH: params.search?.trim() || null,
          ESTADO: params.estado,
          PAGEINDEX: params.pageIndex,
          PAGESIZE: params.pageSize,
        })}`,
      )
      const totalCount = Number(rows[0]?.total_count ?? 0)
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    enabled: actividadId != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

/** `GET /actividades/:ID/candidatos`: estudiantes inscribibles (selector Estudiante). */
export function useCandidatosQuery(actividadId: number | undefined, search = "", enabled = true) {
  return useQuery({
    queryKey: actividadesKeys.candidatos(actividadId ?? "none", search),
    queryFn: () =>
      evalCol.getRows<CandidatoRow>(
        `${BASE_ACTIVIDADES}/${actividadId}/candidatos${queryString({ SEARCH: search.trim() || null, LIMITE: 50 })}`,
      ),
    enabled: enabled && actividadId != null,
    retry: false,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export interface SesionesParams {
  pageIndex: number
  pageSize: number
}

/** `GET /actividades/:ID/sesiones`. */
export function useSesionesQuery(actividadId: number | undefined, params: SesionesParams) {
  return useQuery({
    queryKey: actividadesKeys.sesiones(actividadId ?? "none", params),
    queryFn: async () => {
      const rows = await evalCol.getRows<SesionRow>(
        `${BASE_ACTIVIDADES}/${actividadId}/sesiones${queryString({ PAGEINDEX: params.pageIndex, PAGESIZE: params.pageSize })}`,
      )
      const totalCount = Number(rows[0]?.total_count ?? 0)
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    enabled: actividadId != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

/** `GET /actividades/sesiones/:ID` (JSON). */
export function useSesionQuery(sesionId: number | undefined) {
  return useQuery({
    queryKey: actividadesKeys.sesion(sesionId ?? "none"),
    queryFn: () =>
      evalCol.getRows<Record<string, unknown>>(`${BASE_ACTIVIDADES}/sesiones/${sesionId}`).then((r) => {
        const fila = r[0]
        if (!fila) throw new Error("No se encontró la sesión.")
        return ("datos" in fila ? desenvolver<SesionDetalle>(fila, "datos", "") : fila) as SesionDetalle
      }),
    enabled: sesionId != null,
    retry: false,
  })
}
