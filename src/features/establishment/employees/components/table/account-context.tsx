import { createContext, useContext } from "react"

import type { AccountStatus } from "@/features/establishment/employees/api/query/use-account-status"

/**
 * Datos de cuenta por fila que necesitan las acciones de correo. Viajan por
 * contexto y no por `createColumns`: así las columnas no se rehacen cada vez
 * que llegan los correos o los estados (TanStack Table reinicia estado
 * interno cuando cambia la referencia de `columns`).
 */
export interface EmployeeAccountInfo {
  /** `undefined` mientras carga el detalle o si el funcionario no tiene correo. */
  email: string | undefined
  isEmailLoading: boolean
  /** `undefined` mientras se consulta o si no hay correo. */
  status: AccountStatus | undefined
  isStatusLoading: boolean
  isStatusError: boolean
}

export const EmployeeAccountContext = createContext<(id: number) => EmployeeAccountInfo>(() => ({
  email: undefined,
  isEmailLoading: false,
  status: undefined,
  isStatusLoading: false,
  isStatusError: false,
}))

export function useEmployeeAccount(id: number) {
  return useContext(EmployeeAccountContext)(id)
}
