import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import type { OrdenServidor } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { desenvolver } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { citacionesKeys } from "@/features/gestion-estudiantil/citaciones/api/query-keys"
import type {
  AcudienteMatricula,
  CitacionDetalle,
  CitacionRow,
  CitacionesFiltros,
  CitacionesQueryFilters,
} from "@/features/gestion-estudiantil/citaciones/api/types"

export const BASE_CITACIONES = "/gestion-estudiantil/citaciones"

const id = (value: string) => (value ? Number(value) : null)

export function toCitacionesFilters(search: string, f: CitacionesFiltros): CitacionesQueryFilters {
  return {
    SEARCH: search.trim() || null,
    ESTADO: f.estado || null,
    FK_TLV_MOTIVO: id(f.motivo),
    FK_TFUNCIONARIO_ATIENDE: id(f.atiende),
    DESDE: f.desde || null,
    HASTA: f.hasta || null,
    FK_TSEDE: id(f.sede),
    FK_TLV_JORNADA: id(f.jornada),
  }
}

export interface CitacionesParams {
  filters: CitacionesQueryFilters
  pageIndex: number
  pageSize: number
  orden?: OrdenServidor
}

export const fetchCitaciones = async (params: CitacionesParams) => {
  const rows = await evalCol.postRows<CitacionRow>(`${BASE_CITACIONES}/query`, {
    FILTERS: params.filters,
    ...params.orden,
    PAGEINDEX: params.pageIndex,
    PAGESIZE: params.pageSize,
  })
  const totalCount = Number(rows[0]?.total_count ?? 0)
  return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
}

/** `POST /citaciones/query`: el alcance lo aplica el backend; `total_count` viene repetido en cada fila. */
export function useCitacionesQuery(params: CitacionesParams) {
  return useQuery({
    queryKey: citacionesKeys.citaciones.lista(params),
    queryFn: () => fetchCitaciones(params),
    placeholderData: (prev) => prev,
  })
}

export const fetchCitacion = (citacionId: number | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE_CITACIONES}/${citacionId}`)
    .then((r) => desenvolver<CitacionDetalle>(r[0], "datos", "No se encontró la citación solicitada."))

/** `GET /citaciones/:ID`: la fila con su historial, en la columna `datos`. */
export function useCitacionQuery(citacionId: number | undefined) {
  return useQuery({
    queryKey: citacionesKeys.citaciones.detalle(citacionId ?? "none"),
    queryFn: () => fetchCitacion(citacionId),
    enabled: citacionId != null,
  })
}

/** `GET /citaciones/acudiente/:MATRICULA`: acudiente de la matrícula; solo se consulta con matrícula elegida. */
export function useAcudienteQuery(matricula: number | null) {
  return useQuery({
    queryKey: [...citacionesKeys.all, "acudiente", matricula] as const,
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_CITACIONES}/acudiente/${matricula}`)
        .then((r) => desenvolver<AcudienteMatricula>(r[0], "datos", "No se encontró la matrícula solicitada.")),
    enabled: matricula != null,
    staleTime: 30_000,
  })
}
