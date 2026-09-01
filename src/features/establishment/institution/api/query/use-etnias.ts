import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { unwrapRows } from "@/lib/response-envelope"

// `TETNIA`/resguardo no es `TLISTA_VALOR`: tiene su propia tabla y su propio
// endpoint (igual que discapacidades y municipios, ver `use-disability-
// types.ts`) — no lo cubre el catálogo genérico `/select/:categoria`.
interface RealEtniaRow {
  pk_etnia: number
  codigo: string
  nombre: string
}

async function fetchEtnias(): Promise<CatalogItem[]> {
  if (env.ENABLE_API_MOCKING) {
    return []
  }
  const response = (await api.get("/eval-col/catalogos/etnias")) as unknown as
    | { rows: RealEtniaRow[] }
    | RealEtniaRow[]
  const rows = unwrapRows<RealEtniaRow>(response)
  return rows.map((row) => ({
    id: row.pk_etnia,
    code: row.codigo,
    name: row.nombre,
  }))
}

export function useEtniasQuery() {
  return useQuery({
    queryKey: ["catalogs", "etnias"],
    queryFn: fetchEtnias,
  })
}
