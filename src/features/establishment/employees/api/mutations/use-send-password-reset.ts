import { useForgotPassword } from "@/features/auth/api/mutations/forgot-password"

/**
 * Restablecer contraseña desde la tabla de funcionarios: es exactamente el
 * mismo flujo público de "¿Olvidaste tu contraseña?" (`GET
 * /sso-admin/forgotPassword?email=&app=`), disparado por el administrador en
 * nombre del funcionario. Se reusa el hook de `features/auth` para no
 * duplicar la compatibilidad con las dos versiones del backend.
 */
export const useSendPasswordReset = useForgotPassword
