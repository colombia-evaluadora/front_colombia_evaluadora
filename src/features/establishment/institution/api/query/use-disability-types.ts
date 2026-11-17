import { catalogoMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { CATALOGS } from "@/lib/catalogs"
import { unwrapRows } from "@/lib/response-envelope"

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
  // `api` (no `fetch` crudo): agrega el `Authorization: Bearer <token>` que
  // el gateway real exige — sin eso responde 403 antes de llegar a la query.
  const response = (await api.get("/eval-col/catalogos/discapacidades")) as unknown as
    | { rows: RealDisabilityTypeRow[] }
    | RealDisabilityTypeRow[]
  const rows = unwrapRows<RealDisabilityTypeRow>(response)
  return rows.map((row) => ({
    id: row.pk_discapacidad,
    code: row.codigo,
    name: row.nombre,
  }))
}

/** `enabled: false` cuando la pantalla trae su propio catálogo (inscripción pública, sin sesión). */
export function useDisabilityTypesQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    staleTime: Infinity,
    queryKey: ["catalogs", "disability-types"],
    meta: catalogoMeta(),
    queryFn: fetchDisabilityTypes,
  })
}
