import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  AreaSubject,
  AreaSubjectItem,
  AreaSubjectsQueryRequest,
  AreaSubjectsQueryResponse,
} from "@/features/establishment/academic-period/api/types/area-subject"

interface UseAreaSubjectQueryParams {
  filters: AreaSubjectsQueryRequest["filters"]
  sorting: AreaSubjectsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
  enabled?: boolean
}

interface GeneralAreaRow {
  id: number
  nombre: string
}
interface GeneralAreasResponse {
  rows: GeneralAreaRow[]
}
async function fetchGeneralAreaNames(): Promise<Map<number, string>> {
  const raw: GeneralAreasResponse = await api.get("/eval-col/areas/general")
  return new Map((raw.rows ?? []).map((row) => [row.id, row.nombre]))
}

interface AreaListRow {
  id: number
  codigo: string
  nombre_interno: string
  area_general_id: number
  orden_reportes: number
  total_count?: number
}
interface AreasListRawResponse {
  rows: AreaListRow[]
}

interface SubjectRow {
  id: number
  abreviacion: string
  nombre_interno: string
  asignatura_general_id: number
  enfasis_id: number | null
  enfasis_nombre: string | null
  color: string | null
  orden_reportes: number
}
interface SubjectsResponse {
  rows: SubjectRow[]
}
async function fetchAreaSubjectItems(
  areaId: number,
  generalAreaNames: Map<number, string>
): Promise<AreaSubjectItem[]> {
  const raw: SubjectsResponse = await api.get(
    `/eval-col/areas/${areaId}/asignaturas`
  )
  return (raw.rows ?? []).map((row) => ({
    id: row.id,
    asignaturaGeneral: generalAreaNames.get(row.asignatura_general_id) ?? "",
    nombreInterno: row.nombre_interno,
    abreviacion: row.abreviacion,
    ordenReportes: row.orden_reportes,
    color: row.color ?? undefined,
    especialidad: row.enfasis_nombre ?? undefined,
  }))
}

async function fetchAreaSubject(
  params: UseAreaSubjectQueryParams
): Promise<AreaSubjectsQueryResponse> {
  const { filters, sorting, pageIndex, pageSize, academicPeriodId } = params
  const [primary] = sorting

  const generalAreaNames = await fetchGeneralAreaNames()

  const raw: AreasListRawResponse = await api.query("/eval-col/areas/query", {
    FK_PERIODO: academicPeriodId ?? 0,
    NOMBRE_INTERNO: filters.nombreInterno ?? null,
    PAGE_INDEX: pageIndex,
    PAGE_SIZE: pageSize,
    SORT_BY: primary?.id ?? null,
    SORT_DIR: primary ? (primary.desc ? "desc" : "asc") : null,
  })
  const areaRows = raw.rows ?? []
  const totalCount = areaRows[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  const rows: AreaSubject[] = await Promise.all(
    areaRows.map(async (row) => ({
      codigo: row.id,
      areaGeneral: generalAreaNames.get(row.area_general_id) ?? "",
      nombreInterno: row.nombre_interno,
      abreviacion: row.codigo,
      ordenReportes: row.orden_reportes,
      subjects: await fetchAreaSubjectItems(row.id, generalAreaNames),
    }))
  )

  const filtered = rows.filter((row) => {
    if (
      filters.areaGeneral &&
      !row.areaGeneral.toLowerCase().includes(filters.areaGeneral.toLowerCase())
    ) {
      return false
    }
    if (
      filters.abreviacion &&
      !row.abreviacion.toLowerCase().includes(filters.abreviacion.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return { rows: filtered, pageCount, totalCount }
}

export const areaSubjectQueryKey = (params: UseAreaSubjectQueryParams) => {
  const { enabled: _enabled, ...key } = params
  return ["area-subjects", key]
}

export function useAreaSubjectQuery(params: UseAreaSubjectQueryParams) {
  return useQuery({
    queryKey: areaSubjectQueryKey(params),
    queryFn: () => fetchAreaSubject(params),
    placeholderData: (previous) => previous,
    enabled: params.enabled ?? true,
  })
}
