import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"

import { fetchCurricularReferenceAreas } from "@/features/academic-management/curricular-references/api/query/use-curricular-reference-areas"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

interface CurricularReferenceResponse {
  status: "ok" | "error"
  message?: string
  curricularReference?: CurricularReference
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
  fk_tlv_enfoque_pedagogico: number | null
  enfoque_pedagogico: string | null
  fk_tlv_tipo_evaluacion: number | null
  tipo_evaluacion: string | null
  fk_tlv_nombre_asignatura: number | null
  nombre_asignatura: string | null
  nivel_1_etiqueta: string
  nivel_2_etiqueta: string
  instrumento: string
  instrumento_info_adicional: string | null
  normatividad: string
  anio_vigencia_desde: number
  anio_vigencia_hasta: number | null
  estado: "A" | "I"
  active: boolean
}

function parseNiveles(niveles: CurricularReferenceRow["niveles"]): NivelRow[] {
  if (!niveles) return []
  const parsed = typeof niveles === "string" ? JSON.parse(niveles) : niveles
  return Array.isArray(parsed) ? parsed : []
}

function toCurricularReference(row: CurricularReferenceRow, areas: CurricularReference["areas"]): CurricularReference {
  return {
    id: row.pk_referente_curricular,
    name: row.nombre,
    educationLevels: parseNiveles(row.niveles).map((nivel) => ({
      id: nivel.id,
      code: nivel.codigo,
      name: nivel.nombre,
    })),
    description: row.descripcion,
    level1: row.nivel_1_etiqueta,
    level2: row.nivel_2_etiqueta,
    pedagogicalApproach:
      row.fk_tlv_enfoque_pedagogico != null
        ? { id: row.fk_tlv_enfoque_pedagogico, code: "", name: row.enfoque_pedagogico ?? "" }
        : null,
    evaluationType:
      row.fk_tlv_tipo_evaluacion != null
        ? { id: row.fk_tlv_tipo_evaluacion, code: "", name: row.tipo_evaluacion ?? "" }
        : null,
    subjectLabel:
      row.fk_tlv_nombre_asignatura != null
        ? { id: row.fk_tlv_nombre_asignatura, code: "", name: row.nombre_asignatura ?? "" }
        : null,
    areas,
    instrument: row.instrumento,
    instrumentDescription: row.instrumento_info_adicional ?? "",
    regulation: row.normatividad,
    active: row.estado === "A",
    createdYear: row.anio_vigencia_desde,
    deactivatedYear: row.anio_vigencia_hasta,
  }
}

async function fetchCurricularReference(id: number): Promise<CurricularReference> {
  const url = apiPath(`/academic-management/curricular-references/${id}`, `/referentes-curriculares/${id}`)

  if (env.ENABLE_API_MOCKING) {
    const response = await api.get<CurricularReferenceResponse>(url)
    if (response.status === "error" || !response.curricularReference) {
      throw new Error(response.message ?? "Referente curricular no encontrado.")
    }
    return response.curricularReference
  }

  const [raw, referenceAreas] = await Promise.all([
    api.get<RowsEnvelope<CurricularReferenceRow>>(url),
    fetchCurricularReferenceAreas(id),
  ])
  const areas = referenceAreas.map((area) => ({ id: area.id, code: "", name: area.name }))
  return toCurricularReference(unwrapRow(raw), areas)
}

export const curricularReferenceQueryKey = (id: number) => ["curricular-reference", id]

export function useCurricularReferenceQuery(id: number) {
  return useQuery({
    queryKey: curricularReferenceQueryKey(id),
    queryFn: () => fetchCurricularReference(id),
    enabled: Number.isFinite(id),
  })
}
