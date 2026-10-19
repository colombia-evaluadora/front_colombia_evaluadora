import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

/** Estado SSO calculado por auth-center: solo `PENDING_ACTIVATION` permite reenviar; `NOT_FOUND` permite invitar. */
export type AccountStatus = "ACTIVE" | "PENDING_ACTIVATION" | "INACTIVE" | "NOT_FOUND"

export interface AccountStatusRow {
  correo: string
  estado: AccountStatus
}

export const accountStatusQueryKey = (correos: string[]) =>
  employeeKeys.estadoCuenta(correos)

async function fetchAccountStatus(correos: string[]): Promise<AccountStatusRow[]> {
  return api.post<AccountStatusRow[]>("/auth/register/cval/funcionario/estado-cuenta", { correos })
}

// Si falla, la tabla sigue; solo se deshabilita reenviar activación.
export function useAccountStatusQuery(correos: string[]) {
  return useQuery({
    queryKey: accountStatusQueryKey(correos),
    queryFn: () => fetchAccountStatus(correos),
    enabled: correos.length > 0,
    placeholderData: (previous) => previous,
  })
}
