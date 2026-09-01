import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import { unwrapRows } from "@/lib/response-envelope"

import type {
  CurricularReference,
  CurricularReferencesQueryRequest,
  CurricularReferencesQueryResponse,
} from "@/features/academic-management/curricular-references/api/types/curricular-reference"

interface UseCurricularReferencesQueryParams {
  filters: CurricularReferencesQueryRequest["filters"]
  sorting: CurricularReferencesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

interface CurricularReferenceRow {
  pk_referente_curricular: number
  nombre: string
  descripcion: string
  nivel_educativo: string | null
  instrumento: string
  enfoque_pedagogico: string | null
  tipo_evaluacion: string | null
  estado: "A" | "I"
  anio_vigencia_desde: number
  anio_vigencia_hasta: number | null
  active: boolean
  total_count: number
}

function displayOnlyCatalogItem(name: string | null): CurricularReference["educationLevel"] {
  return name ? { id: -1, code: "", name } : null
}

function toCurricularReference(row: CurricularReferenceRow): CurricularReference {
  return {
    id: row.pk_referente_curricular,
    name: row.nombre,
    educationLevel: displayOnlyCatalogItem(row.nivel_educativo),
    description: row.descripcion,
    level1: "",
    level2: "",
    pedagogicalApproach: displayOnlyCatalogItem(row.enfoque_pedagogico),
    evaluationType: displayOnlyCatalogItem(row.tipo_evaluacion),
    areas: [],
    instrument: row.instrumento,
    instrumentDescription: "",
    regulation: "",
    active: row.estado === "A",
    createdYear: row.anio_vigencia_desde,
    deactivatedYear: row.anio_vigencia_hasta,
  }
}

async function fetchCurricularReferences(
  params: UseCurricularReferencesQueryParams,
): Promise<CurricularReferencesQueryResponse> {
  const url = apiPath(
    "/academic-management/curricular-references/query",
    "/referentes-curriculares/query",
  )

  if (env.ENABLE_API_MOCKING) {
    return api.query(url, {
      filters: params.filters,
      sorting: params.sorting,
      pageIndex: params.pageIndex,
      pageSize: params.pageSize,
    })
  }

  const [primary] = params.sorting
  const raw = await api.query(url, {
    FILTERS: {
      SEARCH: params.filters.search || null,
      NIVEL_EDUCATIVO: params.filters.educationLevels?.[0] ? Number(params.filters.educationLevels[0]) : null,
      ENFOQUE_PEDAGOGICO: params.filters.pedagogicalApproaches?.[0]
        ? Number(params.filters.pedagogicalApproaches[0])
        : null,
      TIPO_EVALUACION: params.filters.evaluationTypes?.[0] ? Number(params.filters.evaluationTypes[0]) : null,
      ESTADO: params.filters.active ? (params.filters.active === "true" ? "A" : "I") : null,
    },
    SORTING: primary ? { ID: primary.id, DESC: primary.desc } : { ID: null, DESC: null },
    PAGEINDEX: params.pageIndex,
    PAGESIZE: params.pageSize,
  })

  const rawRows = unwrapRows<CurricularReferenceRow>(raw as CurricularReferenceRow[] | { rows: CurricularReferenceRow[] })
  const totalCount = rawRows[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return { rows: rawRows.map(toCurricularReference), pageCount, totalCount }
}

export const curricularReferencesQueryKey = (params: UseCurricularReferencesQueryParams) => [
  "curricular-references",
  params,
]

export function useCurricularReferencesQuery(params: UseCurricularReferencesQueryParams) {
  return useQuery({
    queryKey: curricularReferencesQueryKey(params),
    queryFn: () => fetchCurricularReferences(params),
    placeholderData: (previous) => previous,
  })
}
