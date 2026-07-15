import type { User } from "@/types/api"

export const authUsers: (User & { password: string })[] = [
  {
    id: "1",
    email: "admin@example.com",
    password: "password",
    name: "Admin Demo",
    role: "ADMIN",
  },
  {
    id: "2",
    email: "user@example.com",
    password: "password",
    name: "Usuario Demo",
    role: "USER",
  },
]

export function findUserByCredentials(email: string, password: string) {
  return authUsers.find((u) => u.email === email && u.password === password)
}

export function findUserByToken(token: string) {
  const id = token.replace("mock-token-", "")
  return authUsers.find((u) => u.id === id)
}
