import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { superadministradorKeys } from "@/features/administration/superadministradores/api/query-keys"
import type {
  Resultado,
  Superadministrador,
  TipoDocumentoXl,
} from "@/features/administration/superadministradores/api/types/superadministrador"

// Son pocos: orden y página se resuelven en el front, como en las demás vistas del módulo.
async function fetchSuperadministradores() {
  const [row] = await evalCol.getRows<Resultado<Superadministrador[]>>("/superadministradores")
  return row?.resultado ?? []
}

export function useSuperadministradoresQuery() {
  return useQuery({ queryKey: superadministradorKeys.lista, queryFn: fetchSuperadministradores })
}

async function fetchTiposDocumento() {
  const [row] = await evalCol.getRows<Resultado<TipoDocumentoXl[]>>(
    "/catalogos/superadministradores/tipos-documento",
  )
  return row?.resultado ?? []
}

/** Tipo de documento XL (CC, CE, PA, PPT, SC-2, CD). */
export function useTiposDocumentoXlQuery() {
  return useQuery({
    queryKey: superadministradorKeys.tiposDocumento,
    queryFn: fetchTiposDocumento,
    staleTime: Infinity,
  })
}
