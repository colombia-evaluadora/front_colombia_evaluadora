import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { catalogoMeta, proveedorMeta } from "@/lib/offline/query-meta"
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
}

/** Fila de `GET /establecimientos/sedes/especialidades/catalogo`. */
interface RealSpecialtyCatalogRow {
  id: number
  nombre: string
  fk_caracter: number
  caracter_nombre: string
  es_otra: boolean
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

export async function fetchSpecialtyCatalog(): Promise<SpecialtyCatalogItem[]> {
  const rows = await evalCol.getRows<RealSpecialtyCatalogRow>("/establecimientos/sedes/especialidades/catalogo")
  return rows.map((row) => ({
    id: row.id,
    name: row.nombre,
    characterId: row.fk_caracter,
    characterName: row.caracter_nombre,
    isOther: row.es_otra === true,
  }))
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
