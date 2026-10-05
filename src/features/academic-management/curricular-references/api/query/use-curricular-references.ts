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
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { toPaginated } from "@/lib/pagination"

interface UseCurricularReferencesQueryParams {
  filters: CurricularReferencesQueryRequest["filters"]
  sorting: CurricularReferencesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

interface NivelRow {
  id: number
  codigo: string
  nombre: string
}

interface CurricularReferenceRow {
  pk_referente_curricular: number
  nombre: string
  descripcion: string
  niveles: NivelRow[] | string | null
  instrumento: string
  instrumento_info_adicional: string | null
  rotulo_ejecucion: string
  grados_vinculados: NivelRow[] | string | null
  enfoque_pedagogico: string | null
  tipo_evaluacion: string | null
  nombre_asignatura: string | null
  estado: "A" | "I"
  anio_vigencia_desde: number
  anio_vigencia_hasta: number | null
  modificado_por: string | null
  modificado_en: string | null
  active: boolean
  total_count: number
}

function displayOnlyCatalogItem(name: string | null): CatalogItem | null {
  return name ? { id: -1, code: "", name } : null
}

function parseNiveles(niveles: CurricularReferenceRow["niveles"]): NivelRow[] {
  if (!niveles) return []
  const parsed = typeof niveles === "string" ? JSON.parse(niveles) : niveles
  return Array.isArray(parsed) ? parsed : []
}

function toCurricularReference(row: CurricularReferenceRow): CurricularReference {
  return {
    id: row.pk_referente_curricular,
    name: row.nombre,
    educationLevels: parseNiveles(row.niveles).map((nivel) => ({
      id: nivel.id,
      code: nivel.codigo,
      name: nivel.nombre,
    })),
    description: row.descripcion,
    level1: "",
    level2: "",
    pedagogicalApproach: displayOnlyCatalogItem(row.enfoque_pedagogico),
    evaluationType: displayOnlyCatalogItem(row.tipo_evaluacion),
    subjectLabel: displayOnlyCatalogItem(row.nombre_asignatura),
    areas: [],
    instrument: row.instrumento,
    instrumentDescription: row.instrumento_info_adicional ?? "",
    executionLabel: row.rotulo_ejecucion ?? "",
    regulation: "",
    active: row.estado === "A",
    createdYear: row.anio_vigencia_desde,
    deactivatedYear: row.anio_vigencia_hasta,
    gradosVinculados: parseNiveles(row.grados_vinculados).map((grado) => ({
      id: grado.id,
      code: grado.codigo,
      name: grado.nombre,
    })),
    lastModifiedBy: row.modificado_por,
    lastModifiedAt: row.modificado_en,
  }
}

/**
 * Filtros de la tabla → `FILTERS` del backend real (`fn_refcurr_listar`).
 * Exportado porque el reporte PDF/Excel (`/reportes/referentes-curriculares`)
 * llama a la MISMA función sin paginar y tiene que filtrar exactamente igual
 * que lo que se ve en pantalla.
 */
export function toCurricularReferencesFilters(filters: CurricularReferencesQueryRequest["filters"]) {
  return {
    SEARCH: filters.search || null,
    NIVEL_EDUCATIVO: filters.educationLevels?.[0] ? Number(filters.educationLevels[0]) : null,
    ENFOQUE_PEDAGOGICO: filters.pedagogicalApproaches?.[0] ? Number(filters.pedagogicalApproaches[0]) : null,
    TIPO_EVALUACION: filters.evaluationTypes?.[0] ? Number(filters.evaluationTypes[0]) : null,
    ESTADO: filters.active ? (filters.active === "true" ? "A" : "I") : null,
  }
}

/** Orden de la tabla → `SORTING` del backend real (un solo criterio). */
export function toCurricularReferencesSorting(sorting: CurricularReferencesQueryRequest["sorting"]) {
  const [primary] = sorting
  return primary ? { ID: primary.id, DESC: primary.desc } : { ID: null, DESC: null }
}

export async function fetchCurricularReferences(
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

  const raw = await api.query(url, {
    FILTERS: toCurricularReferencesFilters(params.filters),
    SORTING: toCurricularReferencesSorting(params.sorting),
    PAGEINDEX: params.pageIndex,
    PAGESIZE: params.pageSize,
  })

  const rawRows = unwrapRows<CurricularReferenceRow>(raw as CurricularReferenceRow[] | { rows: CurricularReferenceRow[] })
  return toPaginated(rawRows, { pageSize: params.pageSize, map: toCurricularReference })
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
