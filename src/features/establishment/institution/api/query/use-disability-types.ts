import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { CATALOGS } from "@/lib/catalogs"

interface RealDisabilityTypeRow {
  pk_discapacidad: number
  codigo: string
  nombre: string
}

async function fetchDisabilityTypes(): Promise<CatalogItem[]> {
  // TDISCAPACIDAD no es TLISTA_VALOR: no lo cubre el catálogo genérico
  // `/select/:categoria` (ver use-catalogs.ts) — tiene su propia tabla,
  // igual que TMUNICIPIO y TPROPIEDAD_JURIDICA (ver V58 en el SSO).
  if (env.ENABLE_API_MOCKING) {
    return getCatalog<CatalogItem>(CATALOGS.DISABILITIES)
  }
  const response = await fetch("/api/catalogos/discapacidades")
  if (!response.ok) {
    throw new Error("No fue posible obtener los tipos de discapacidad")
  }
  const body: { rows: RealDisabilityTypeRow[] } = await response.json()
  return body.rows.map((row) => ({
    id: row.pk_discapacidad,
    code: row.codigo,
    name: row.nombre,
  }))
}

export function useDisabilityTypesQuery() {
  return useQuery({
    queryKey: ["catalogs", "disability-types"],
    queryFn: fetchDisabilityTypes,
  })
}
