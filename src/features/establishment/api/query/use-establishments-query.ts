import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
    EstablishmentsQueryRequest,
    EstablishmentsQueryResponse,
} from "../types/establishment"

interface UseEstablishmentsQueryParams {
    filters: EstablishmentsQueryRequest["filters"]
    sorting: EstablishmentsQueryRequest["sorting"]
    pageIndex: number
    pageSize: number
}

function fetchEstablishments(
    body: EstablishmentsQueryRequest
): Promise<EstablishmentsQueryResponse> {
    return api.query("/establishments/query", body)
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