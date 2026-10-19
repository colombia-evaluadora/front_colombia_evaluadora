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

// Los Select mandan ids como texto y los binds son BIGINT[]: se convierten.
// Exportado: la exportación debe aplicar la misma conversión.
export function toEstablishmentsQueryFilters(filters: EstablishmentsQueryRequest["filters"]) {
    // `status` viaja como código (bind VARCHAR[]).
    return { ...filters, status: filters.status ?? [] }
}

interface UseEstablishmentsQueryParams {
    filters: EstablishmentsQueryRequest["filters"]
    sorting: EstablishmentsQueryRequest["sorting"]
    pageIndex: number
    pageSize: number
}

/** Fila de `fn_est_listar_paginado`: columnas sueltas en snake_case. */
interface RealEstablishmentRow {
    pk_establecimiento: number
    codigo: string
    nombre: string
    fk_departamento: number
    departamento_nombre: string
    fk_municipio: number
    municipio_nombre: string
    fk_estado: number
    estado_nombre: string
}

function toEstablishment(row: RealEstablishmentRow): Establishment {
    return {
        id: row.pk_establecimiento,
        dane: row.codigo,
        name: row.nombre,
        department: row.departamento_nombre,
        municipality: row.municipio_nombre,
        status: String(row.fk_estado),
        statusLabel: row.estado_nombre,
    }
}

async function fetchEstablishments(
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
