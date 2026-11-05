import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { supervisorKeys } from "@/features/administration/supervisores-territoriales/api/query-keys"
import type {
  CatalogosSupervisor,
  Resultado,
  SupervisorTerritorial,
} from "@/features/administration/supervisores-territoriales/api/types/supervisor"

// Son pocos: orden y página se resuelven en el front, como en Superadministradores.
async function fetchSupervisores() {
  const [row] = await evalCol.getRows<Resultado<SupervisorTerritorial[]>>("/supervisores-territoriales")
  return row?.resultado ?? []
}

export function useSupervisoresQuery() {
  return useQuery({ queryKey: supervisorKeys.lista, queryFn: fetchSupervisores })
}

async function fetchSupervisor(id: number) {
  const [row] = await evalCol.getRows<Resultado<SupervisorTerritorial>>(`/supervisores-territoriales/${id}`)
  if (!row) throw new Error("No existe el Supervisor territorial solicitado.")
  return row.resultado
}

export function useSupervisorQuery(id: number | null) {
  return useQuery({
    queryKey: supervisorKeys.detalle(id ?? 0),
    queryFn: () => fetchSupervisor(id as number),
    enabled: id != null,
  })
}

async function fetchCatalogos() {
  const [row] = await evalCol.getRows<Resultado<CatalogosSupervisor>>("/catalogos/supervisores-territoriales")
  return row?.resultado ?? { tiposDocumento: [], establecimientos: [] }
}

/** Tipo de documento XL y establecimientos activos para el formulario. */
export function useCatalogosSupervisorQuery() {
  return useQuery({ queryKey: supervisorKeys.catalogos, queryFn: fetchCatalogos, staleTime: 60_000 })
}
