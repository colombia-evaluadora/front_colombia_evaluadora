import { api } from "@/lib/api-client"

interface NamedRow {
  id: number
  nombre_interno: string
}
interface NamedRowsResponse {
  rows: NamedRow[]
}

export interface ObligatoriaPayload {
  asignaturaId: number | null
  areaId: number | null
}

// `fn_criterio_prom_guardar` recibe `p_obligatorias` como JSONB de
// `{asignaturaId|areaId}` (exactamente uno de los dos por elemento), pero el
// front elige "obligatorias" por NOMBRE (`SubjectsMultiSelect`, ver
// tab-promotion-criteria.tsx). Se re-resuelve nombre→id contra el mismo
// catálogo que llena el select (`useSubjectsQuery`/`usePeriodAreaNamesQuery`)
// justo antes de guardar — nombres que ya no existan en el catálogo (carrera
// entre cargar el form y guardar) se descartan en silencio, igual que el
// `useEffect` de `RequiredSubjectsField` que ya los filtra en la UI.
export async function resolveObligatorias(
  academicPeriodId: number,
  curriculumNode: string,
  names: string[]
): Promise<ObligatoriaPayload[]> {
  if (names.length === 0) return []

  if (curriculumNode === "AR") {
    const raw: NamedRowsResponse = await api.query("/eval-col/areas/query", {
      FK_PERIODO: academicPeriodId,
      NOMBRE_INTERNO: null,
      // 0-based (fn_area_listar/fn_subject_periodo_listar hacen
      // OFFSET page_index * page_size); con 1 siempre volvía vacío, así que
      // requiredSubjects nunca se resolvía a nada al guardar.
      PAGE_INDEX: 0,
      PAGE_SIZE: 200,
      SORT_BY: null,
      SORT_DIR: null,
    })
    const idByName = new Map((raw.rows ?? []).map((row) => [row.nombre_interno, row.id]))
    return names
      .map((name) => idByName.get(name))
      .filter((id): id is number => id != null)
      .map((areaId) => ({ asignaturaId: null, areaId }))
  }

  const raw: NamedRowsResponse = await api.query("/eval-col/areas/asignaturas", {
    FK_PERIODO: academicPeriodId,
    FILTRO: null,
    PAGE_INDEX: 0,
    PAGE_SIZE: 200,
    SORT_BY: null,
    SORT_DIR: null,
  })
  const idByName = new Map((raw.rows ?? []).map((row) => [row.nombre_interno, row.id]))
  return names
    .map((name) => idByName.get(name))
    .filter((id): id is number => id != null)
    .map((asignaturaId) => ({ asignaturaId, areaId: null }))
}
