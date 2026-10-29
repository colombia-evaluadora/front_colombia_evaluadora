import { proveedorMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { apiPath } from "@/lib/api-routes"
import { api } from "@/lib/api-client"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"

import type {
    Establishment,
    EstablishmentsQueryRequest,
    EstablishmentsQueryResponse,
} from "@/features/establishment/institution/api/types/establishment"

// Municipio y sector viajan como códigos (binds TEXT[]); vacíos, como lista vacía.
// Exportado: la exportación debe aplicar la misma conversión.
export function toEstablishmentsQueryFilters(filters: EstablishmentsQueryRequest["filters"]) {
    return { search: filters.search, municipality: filters.municipality ?? [], sector: filters.sector ?? [] }
}

interface UseEstablishmentsQueryParams {
    filters: EstablishmentsQueryRequest["filters"]
    sorting: EstablishmentsQueryRequest["sorting"]
    pageIndex: number
    pageSize: number
}

/** Fila de `fn_est_listar_paginado` (sso V574): columnas sueltas en snake_case. */
interface RealEstablishmentRow {
    pk_establecimiento: number
    codigo: string
    nombre: string
    nit: string | null
    fk_municipio: number
    municipio_nombre: string
    departamento_nombre: string
    fk_tlv_sector: number | null
    sector_nombre: string | null
    rector_nombre: string | null
}

function toEstablishment(row: RealEstablishmentRow): Establishment {
    return {
        id: row.pk_establecimiento,
        dane: row.codigo,
        name: row.nombre,
        nit: row.nit ?? "",
        municipality: row.municipio_nombre,
        department: row.departamento_nombre,
        sector: row.sector_nombre ?? "",
        rector: row.rector_nombre ?? "",
    }
}

export async function fetchEstablishments(
    params: EstablishmentsQueryRequest
): Promise<EstablishmentsQueryResponse> {
    if (env.ENABLE_API_MOCKING) {
        const response = await api.query(
            apiPath("/establishments/query", "/establecimientos/query"),
            params,
        )
        return unwrapPaginated(response)
    }

    // El mock espera `sorting` como array; el backend, un único objeto.
    const body = {
        filters: toEstablishmentsQueryFilters(params.filters),
        sorting: toSingleSort(params.sorting),
        pageIndex: params.pageIndex,
        pageSize: params.pageSize,
    }
    const response = await api.query(
        apiPath("/establishments/query", "/establecimientos/query"),
        body,
    )
    const result = unwrapPaginated<RealEstablishmentRow>(response)
    return { ...result, rows: result.rows.map(toEstablishment) }
}

export const establishmentsQueryKey = (params: UseEstablishmentsQueryParams) =>
    establishmentKeys.lista(params)

export function useEstablishmentsQuery(
    params: UseEstablishmentsQueryParams
) {
    return useQuery({
        queryKey: establishmentsQueryKey(params),
    meta: proveedorMeta(),
        queryFn: () => fetchEstablishments(params),
        placeholderData: (previous) => previous,
    })
}
