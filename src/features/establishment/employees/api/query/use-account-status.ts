import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

/**
 * Estado de la cuenta SSO de un funcionario. Lo calcula el auth-center a
 * partir del usuario (no de TFUNCIONARIO): `PENDING_ACTIVATION` = la cuenta
 * existe pero nunca se activó, que es el único caso en el que tiene sentido
 * reenviar el correo de activación; `NOT_FOUND` permite invitar (el backend crea la cuenta pendiente).
 */
export type AccountStatus = "ACTIVE" | "PENDING_ACTIVATION" | "INACTIVE" | "NOT_FOUND"

export interface AccountStatusRow {
  correo: string
  estado: AccountStatus
}

export const accountStatusQueryKey = (correos: string[]) =>
  ["funcionarios-estado-cuenta", correos] as const

async function fetchAccountStatus(correos: string[]): Promise<AccountStatusRow[]> {
  return api.post<AccountStatusRow[]>("/auth/register/cval/funcionario/estado-cuenta", { correos })
}

/**
 * Consulta en un solo request el estado de las cuentas de la página visible.
 * Si falla, la tabla sigue funcionando: solo el botón de reenviar activación
 * queda deshabilitado (ver `ResendActivationDialog`).
 */
export function useAccountStatusQuery(correos: string[]) {
  return useQuery({
    queryKey: accountStatusQueryKey(correos),
    queryFn: () => fetchAccountStatus(correos),
    enabled: correos.length > 0,
    placeholderData: (previous) => previous,
  })
}
