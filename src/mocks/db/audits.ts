import { faker } from "@faker-js/faker"
import type { AuditSession, SessionStatus } from "@/features/audits/api/types/audit"

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function pickStartedAt(): Date {
  // ~1 de cada 5 sesiones arranca hoy, para que las cards de "hoy" no den 0.
  if (faker.number.int({ min: 0, max: 100 }) < 20) {
    return faker.date.between({ from: startOfToday(), to: new Date() })
  }
  return faker.date.recent({ days: 30, refDate: startOfToday() })
}

function createAuditSession(): AuditSession {
  const status: SessionStatus = faker.number.int({ min: 0, max: 100 }) < 25 ? "active" : "closed"
  const startedAt = pickStartedAt()
  const endedAt = status === "closed" ? faker.date.soon({ days: 1, refDate: startedAt }) : null

  // El avatar y la verificación están correlacionados: si está verificado
  // tiene foto de perfil + chulito (badge), si no, solo las iniciales.
  // Así la lectura visual queda consistente: o "perfil completo" o
  // "solo iniciales".
  const authorVerified = faker.datatype.boolean(0.7)

  return {
    id: faker.string.uuid(),
    authorName: faker.person.fullName(),
    authorAvatarUrl: authorVerified ? faker.image.avatarGitHub() : null,
    authorVerified,
    ip: faker.internet.ipv4(),
    startedAt: startedAt.toISOString(),
    endedAt: endedAt ? endedAt.toISOString() : null,
    status,
    operationsCount: faker.number.int({ min: 0, max: 400 }),
  }
}

faker.seed(20260715)

export const auditsDb: AuditSession[] = Array.from({ length: 600 }, createAuditSession)
