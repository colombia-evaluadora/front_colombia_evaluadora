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

export function findUserByEmail(email: string) {
  return authUsers.find((u) => u.email === email)
}

// token -> email, simula el link que el backend real envía por correo.
const passwordResetTokens = new Map<string, string>()

export function createPasswordResetToken(email: string): string {
  const token = `reset-${crypto.randomUUID()}`
  passwordResetTokens.set(token, email)
  return token
}

export function consumePasswordResetToken(token: string): string | undefined {
  const email = passwordResetTokens.get(token)
  if (email) passwordResetTokens.delete(token)
  return email
}

export function setUserPassword(email: string, password: string) {
  const user = findUserByEmail(email)
  if (user) user.password = password
}
