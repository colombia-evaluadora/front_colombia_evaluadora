import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { unwrapRows } from "@/lib/response-envelope"

// `TETNIA`/resguardo no es `TLISTA_VALOR`: tiene su propia tabla y su propio
// endpoint (igual que discapacidades y municipios, ver `use-disability-
// types.ts`) — no lo cubre el catálogo genérico `/select/:categoria`.
// El endpoint devuelve una fila por RESGUARDO (no por etnia): una misma
// etnia puede tener varios resguardos, cada uno con su propio pk. El campo
// que persiste el formulario es `fk_tresguardo`/`ETNIA_RESGUARDO`, así que
// el id de cada opción tiene que ser `pk_resguardo` (único), no `pk_etnia`
// (se repite entre resguardos de la misma etnia) — confirmado contra la
// respuesta real de `/eval-col/catalogos/etnias`.
interface RealEtniaRow {
  pk_resguardo: number
  codigo_resguardo: string
  nombre_resguardo: string
  pk_etnia: number
  nombre_etnia: string
  etiqueta: string
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
    id: row.pk_resguardo,
    code: row.codigo_resguardo,
    name: row.etiqueta,
  }))
}

export function useEtniasQuery() {
  return useQuery({
    queryKey: ["catalogs", "etnias"],
    queryFn: fetchEtnias,
  })
}
