import { useQueries } from "@tanstack/react-query"

import { fetchEmployee } from "@/features/establishment/employees/api/query/use-employee"

/**
 * El listado (`fn_usu_empleados_listar_paginado`) no trae el correo, así que
 * se resuelve con el detalle de cada funcionario de la página visible. La key
 * es la misma del detalle (`["employees", id]`): el diálogo de edición reusa
 * la caché y las mutaciones de funcionarios (que invalidan `["employees"]`)
 * también la refrescan.
 *
 * Devuelve `undefined` para un id mientras su detalle carga o si falló.
 */
export function useEmployeeEmails(ids: number[]) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["employees", id],
      queryFn: () => fetchEmployee(id),
      staleTime: 5 * 60_000,
    })),
  })

  const emailById = new Map<number, string | undefined>()
  ids.forEach((id, index) => {
    const email = results[index]?.data?.employee?.person?.email?.trim()
    emailById.set(id, email ? email.toLowerCase() : undefined)
  })
  const isLoading = results.some((result) => result.isPending)
  return { emailById, isLoading }
}
