export type Role = "ADMIN" | "USER"

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

// Contrato real del backend SSO: el login no devuelve el usuario, solo el
// access token (+ refresh token en cookie httpOnly). El usuario se deriva
// del propio JWT (claims `sub`/`roles`), ver lib/auth-mapper.ts.
export interface AuthResponse {
  token: string
  refreshToken: string
  expiresIn: number
}
