export type Role = "ADMIN" | "USER"

export interface User {
  id: string
  email: string
  name: string
  role: Role
  /**
   * Claims `roles` crudos del token (ej. `"CEVAL-SUPER_ADMINISTRADOR"`,
   * `"CEVAL-JEFE_DE_AREA"`). `role` arriba es la simplificación binaria
   * ADMIN/USER que ya consume `Authorization`; esto es lo que hace falta
   * para chequeos finos como "¿es super admin?" (ver `auth-mapper.ts`).
   */
  roles: string[]
}

/**
 * Respuesta de `/auth/login`. Con la verificación en dos pasos (U.5.DOS) la
 * contraseña correcta no trae tokens: trae `segundoFactor` + `desafio`, y el
 * segundo `/login` (con el código) devuelve los tokens.
 */
export interface AuthResponse {
  token: string
  refreshToken: string
  expiresIn: number
  segundoFactor?: "VERIFICAR" | "CONFIGURAR"
  desafio?: string
  maskedEmail?: string
}
