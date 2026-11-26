import { catalogoMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import {
  fetchSelectCategory,
  fetchSelectCategoryWithParent,
  LISTA_VALOR_STALE_TIME,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"

import type { Department, Municipality } from "@/features/establishment/institution/api/types/location"

/**
 * Municipios de la lista valor MUNICIPIO (sso V104.1/V104.2), con su
 * departamento, que es el valor padre (lista DEPARTAMENTO). El `id` es el
 * `pk_lista_valor` que guardan las entidades (`FK_TMUNICIPIO*`). El código
 * DANE va en ETIQUETA (VALOR también lo lleva, con prefijo fuera de Colombia):
 * es el que espera el filtro de establecimientos por municipio
 * (`fn_est_listar_interno` compara contra ETIQUETA).
 */
export async function fetchMunicipalities(): Promise<Municipality[]> {
  const rows = await fetchSelectCategoryWithParent("MUNICIPIO", "DEPARTAMENTO")
  return rows.map(({ row, padre }) => ({
    id: row.pk_lista_valor,
    code: row.etiqueta ?? row.valor,
    name: row.nombre,
    department: { id: padre?.pk_lista_valor ?? 0, code: padre?.etiqueta ?? padre?.valor, name: padre?.nombre ?? "" },
  }))
}

export function useMunicipalitiesQuery() {
  return useQuery({
    staleTime: LISTA_VALOR_STALE_TIME,
    queryKey: ["catalogs", "municipalities"],
    meta: catalogoMeta(),
    queryFn: fetchMunicipalities,
  })
}

/** Departamentos de la lista valor DEPARTAMENTO: el primer select de la cascada Departamento → Municipio. */
export async function fetchDepartments(): Promise<Department[]> {
  const rows = await fetchSelectCategory("DEPARTAMENTO")
  return rows.map((row) => ({ id: row.pk_lista_valor, code: row.etiqueta ?? row.valor, name: row.nombre }))
}

export function useDepartmentsQuery() {
  return useQuery({
    staleTime: LISTA_VALOR_STALE_TIME,
    queryKey: ["catalogs", "departments"],
    meta: catalogoMeta(),
    queryFn: fetchDepartments,
  })
}
