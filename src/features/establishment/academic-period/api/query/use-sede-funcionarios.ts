import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

export interface SedeFuncionario {
  id: number
  nombre: string
  identificacion: string
}
interface SedeFuncionariosResponse {
  rows: SedeFuncionario[]
}

// `GET /eval-col/sedes/:ID/funcionarios` (`fn_funcionario_sede_listar`,
// id_query 68). Reemplaza a `useEmployeesQuery` (módulo Employees, aparte y
// todavía en mock) como fuente del selector de "director de grupo" — ese
// módulo no tiene forma de resolver a `FK_TFUNCIONARIO` contra
// `academico_test` hoy.
async function fetchSedeFuncionarios(
  sedeId?: string,
  filtro?: string
): Promise<SedeFuncionario[]> {
  if (!sedeId) return []
  const query = new URLSearchParams()
  if (filtro) query.set("filtro", filtro)
  const qs = query.toString()
  const raw: SedeFuncionariosResponse = await api.get(
    `/eval-col/sedes/${sedeId}/funcionarios${qs ? `?${qs}` : ""}`
  )
  return raw.rows ?? []
}

export const sedeFuncionariosQueryKey = (sedeId?: string) => [
  "sede-funcionarios",
  sedeId,
]

export function useSedeFuncionariosQuery(sedeId?: string) {
  return useQuery({
    queryKey: sedeFuncionariosQueryKey(sedeId),
    queryFn: () => fetchSedeFuncionarios(sedeId),
    enabled: sedeId != null,
  })
}
