import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { apiPath } from "@/lib/api-routes"
import { api } from "@/lib/api-client"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
    Establishment,
    EstablishmentsQueryRequest,
    EstablishmentsQueryResponse,
} from "@/features/establishment/institution/api/types/establishment"

interface UseEstablishmentsQueryParams {
    filters: EstablishmentsQueryRequest["filters"]
    sorting: EstablishmentsQueryRequest["sorting"]
    pageIndex: number
    pageSize: number
}

/** Fila cruda de `fn_est_listar_paginado` (V53) — columnas sueltas en
 * snake_case, no el `Establishment` anidado/camelCase que espera la tabla. */
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

    // El mock espera `sorting` como array tal cual; el backend real espera
    // un único objeto (o null) — ver `toSingleSort`. `filters.status` ya
    // trae el `id` como texto (el `<Select>` del buscador manda
    // `String(item.id)`, no el `code` — ver search-establishments.tsx), así
    // que acá solo hace falta convertirlo a número.
    const body = {
        filters: { ...params.filters, status: (params.filters.status ?? []).map(Number) },
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

export const establishmentsQueryKey = (
    params: UseEstablishmentsQueryParams
) => [
    "establishments",
    params,
]

export function useEstablishmentsQuery(
    params: UseEstablishmentsQueryParams
) {
    return useQuery({
        queryKey: establishmentsQueryKey(params),
        queryFn: () => fetchEstablishments(params),
        placeholderData: (previous) => previous,
    })
}
