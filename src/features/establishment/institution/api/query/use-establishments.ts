import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { apiPath } from "@/lib/api-routes"
import { api } from "@/lib/api-client"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
    EstablishmentsQueryRequest,
    EstablishmentsQueryResponse,
} from "@/features/establishment/institution/api/types/establishment"

interface UseEstablishmentsQueryParams {
    filters: EstablishmentsQueryRequest["filters"]
    sorting: EstablishmentsQueryRequest["sorting"]
    pageIndex: number
    pageSize: number
}

async function fetchEstablishments(
        params: EstablishmentsQueryRequest
): Promise<EstablishmentsQueryResponse> {
        // El mock espera `sorting` como array tal cual; el backend real espera
        // un único objeto (o null) — ver `toSingleSort`.
        const body = env.ENABLE_API_MOCKING
            ? params
            : { ...params, sorting: toSingleSort(params.sorting) }
        const response = await api.query(
            apiPath("/establishments/query", "/establecimientos/query"),
            body,
        )
        return unwrapPaginated(response)
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