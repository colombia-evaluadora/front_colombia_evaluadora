import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { administradorKeys } from "@/features/administration/administradores-territoriales/api/query-keys"
import type {
  CatalogosAdministrador,
  Resultado,
  AdministradorTerritorial,
} from "@/features/administration/administradores-territoriales/api/types/administrador"

// Son pocos: orden y página se resuelven en el front, como en Superadministradores.
async function fetchAdministradores() {
  const [row] = await evalCol.getRows<Resultado<AdministradorTerritorial[]>>("/administradores-territoriales")
  return row?.resultado ?? []
}

export function useAdministradoresQuery() {
  return useQuery({ queryKey: administradorKeys.lista, queryFn: fetchAdministradores })
}

async function fetchAdministrador(id: number) {
  const [row] = await evalCol.getRows<Resultado<AdministradorTerritorial>>(`/administradores-territoriales/${id}`)
  if (!row) throw new Error("No existe el Administrador territorial solicitado.")
  return row.resultado
}

export function useAdministradorQuery(id: number | null) {
  return useQuery({
    queryKey: administradorKeys.detalle(id ?? 0),
    queryFn: () => fetchAdministrador(id as number),
    enabled: id != null,
  })
}

async function fetchCatalogos() {
  const [row] = await evalCol.getRows<Resultado<CatalogosAdministrador>>("/catalogos/administradores-territoriales")
  return row?.resultado ?? { tiposDocumento: [] }
}

/** Tipo de documento XL para el formulario. */
export function useCatalogosAdministradorQuery() {
  return useQuery({ queryKey: administradorKeys.catalogos, queryFn: fetchCatalogos, staleTime: 60_000 })
}
