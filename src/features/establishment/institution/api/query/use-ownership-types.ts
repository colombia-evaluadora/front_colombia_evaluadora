import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { CATALOGS } from "@/lib/catalogs"

interface RealOwnershipTypeRow {
  pk_propiedad_juridica: number
  codigo: string
  nombre: string
}

async function fetchOwnershipTypes(): Promise<CatalogItem[]> {
  // TPROPIEDAD_JURIDICA no es TLISTA_VALOR: no lo cubre el catálogo
  // genérico `/select/:categoria` (ver use-catalogs.ts). Ojo: existe una
  // categoría "PROPIEDAD_JURIDICA_OFICIAL" en tlista_valor, pero es otra
  // cosa — el FK real que usa fn_est_crear (p_fk_propiedad_juridica)
  // apunta a TPROPIEDAD_JURIDICA, no a esa categoría.
  if (env.ENABLE_API_MOCKING) {
    return getCatalog<CatalogItem>(CATALOGS.LEGAL_TYPES)
  }
  const response = await fetch("/api/eval-col/catalogos/propiedad-juridica")
  if (!response.ok) {
    throw new Error("No fue posible obtener los tipos de propiedad jurídica")
  }
  const body: { rows: RealOwnershipTypeRow[] } = await response.json()
  return body.rows.map((row) => ({
    id: row.pk_propiedad_juridica,
    code: row.codigo,
    name: row.nombre,
  }))
}

export function useOwnershipTypesQuery() {
  return useQuery({
    queryKey: ["catalogs", "ownership-types"],
    queryFn: fetchOwnershipTypes,
  })
}
