export type Role = "ADMIN" | "USER"

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface AuthResponse {
  user: User
  token: string
}
