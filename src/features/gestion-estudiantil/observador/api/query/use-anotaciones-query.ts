import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import type { OrdenServidor } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { observadorKeys } from "@/features/gestion-estudiantil/observador/api/query-keys"
import type {
  AnotacionRow,
  ObservadorFiltros,
  ObservadorQueryFilters,
} from "@/features/gestion-estudiantil/observador/api/types"

const id = (value: string) => (value ? Number(value) : null)

/** Normalizador exportado: el export usa el mismo objeto que la tabla. */
export function toObservadorFilters(search: string, filtros: ObservadorFiltros): ObservadorQueryFilters {
  return {
    SEARCH: search.trim() || null,
    FK_ESTABLECIMIENTO: id(filtros.establecimiento),
    FK_SEDE: id(filtros.sede),
    FK_JORNADA: id(filtros.jornada),
    FK_GRUPO: id(filtros.grupo),
    FK_PERIODO_EVALUACION: id(filtros.periodo),
    FK_TLV_TIPO: id(filtros.tipo),
    FK_TLV_SITUACION: id(filtros.situacion),
    FK_RESPONSABLE: id(filtros.responsable),
    FK_MATRICULA: null,
  }
}

export interface AnotacionesParams {
  filters: ObservadorQueryFilters
  pageIndex: number
  pageSize: number
  orden?: OrdenServidor
}

export const fetchAnotaciones = async (params: AnotacionesParams) => {
  const rows = await evalCol.postRows<AnotacionRow>("/gestion-estudiantil/observador/query", {
    FILTERS: params.filters,
    ...params.orden,
    PAGEINDEX: params.pageIndex,
    PAGESIZE: params.pageSize,
  })
  const totalCount = rows[0]?.total_count ?? 0
  return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
}

/** `POST /gestion-estudiantil/observador/query`: el alcance (sedes y Tipo II/III) lo aplica el backend. */
export function useAnotacionesQuery(params: AnotacionesParams) {
  return useQuery({
    queryKey: observadorKeys.lista(params),
    queryFn: () => fetchAnotaciones(params),
    placeholderData: (prev) => prev,
  })
}

export const fetchAnotacion = (anotacionId: number | undefined) =>
  evalCol.getRows<AnotacionRow>(`/gestion-estudiantil/observador/${anotacionId}`).then((r) => r[0])

/** `GET /gestion-estudiantil/observador/:ID`: el detalle, para Ver detalle y Modificar. */
export function useAnotacionQuery(anotacionId: number | undefined) {
  return useQuery({
    queryKey: observadorKeys.detalle(anotacionId ?? "none"),
    queryFn: () => fetchAnotacion(anotacionId),
    enabled: anotacionId != null,
  })
}
