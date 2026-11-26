import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { catalogoMeta, proveedorMeta } from "@/lib/offline/query-meta"
import { fetchSelectCategoryWithParent } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"

import type {
  CampusSpecialty,
  CampusStatus,
  SpecialtyCatalogItem,
} from "@/features/establishment/campuses/api/types/campus"

/** Fila de `fn_sed_esp_listar` (sso V448). */
interface RealCampusSpecialtyRow {
  pk_sede_especialidad: number
  fk_caracter: number
  caracter_nombre: string
  fk_especialidad: number
  especialidad_nombre: string
  nombre_propio: string | null
  es_otra: boolean
  estado: CampusStatus
  descripcion: string | null
  actividades: string | null
}

export function toCampusSpecialty(row: RealCampusSpecialtyRow): CampusSpecialty {
  return {
    id: row.pk_sede_especialidad,
    characterId: row.fk_caracter,
    characterName: row.caracter_nombre ?? "",
    specialtyId: row.fk_especialidad,
    specialtyName: row.especialidad_nombre ?? "",
    ownName: row.nombre_propio,
    isOther: row.es_otra === true,
    status: row.estado === "I" ? "I" : "A",
    description: row.descripcion ?? null,
    activities: row.actividades ?? null,
  }
}

export async function fetchCampusSpecialties(campusId: number): Promise<CampusSpecialty[]> {
  const rows = await evalCol.getRows<RealCampusSpecialtyRow>(`/establecimientos/sedes/${campusId}/especialidades`)
  return rows.map(toCampusSpecialty)
}

export function useCampusSpecialtiesQuery(campusId: number | null) {
  return useQuery({
    queryKey: campusKeys.especialidades(campusId),
    meta: proveedorMeta(),
    queryFn: () => fetchCampusSpecialties(campusId as number),
    enabled: Boolean(campusId),
  })
}

/** VALOR de "Otra" en ESPECIALIDAD (C600): la única con nombre propio (sso `fn_sed_esp_es_otra`). */
const ESPECIALIDAD_OTRA = "7"
/** VALOR de "No aplica" en CARACTER: no se ofrece en el catálogo de la sede. */
const CARACTER_NO_APLICA = "0"

/**
 * Lista valor ESPECIALIDAD con su carácter, que es el valor padre (lista
 * CARACTER, sso V104.1). Mismo criterio que el catálogo de sedes del back
 * (V449): sin "No aplica", por orden del carácter y "Otra" al final.
 */
export async function fetchSpecialtyCatalog(): Promise<SpecialtyCatalogItem[]> {
  const rows = await fetchSelectCategoryWithParent("ESPECIALIDAD", "CARACTER")
  return rows
    .filter(({ padre }) => padre && padre.valor !== CARACTER_NO_APLICA)
    .map(({ row, padre }) => ({
      orden: padre!.orden ?? 0,
      item: {
        id: row.pk_lista_valor,
        name: row.nombre,
        characterId: padre!.pk_lista_valor,
        characterName: padre!.nombre,
        isOther: row.valor === ESPECIALIDAD_OTRA,
      },
    }))
    .sort((a, b) => a.orden - b.orden || Number(a.item.isOther) - Number(b.item.isOther))
    .map(({ item }) => item)
}

/** Lista general de especialidades con su carácter: de ahí salen los dos selectores del diálogo. */
export function useSpecialtyCatalogQuery() {
  return useQuery({
    queryKey: campusKeys.catalogoEspecialidades(),
    meta: catalogoMeta(),
    queryFn: fetchSpecialtyCatalog,
    staleTime: Infinity,
  })
}
