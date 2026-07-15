import { faker } from "@faker-js/faker"
import type { AuditSession, SessionStatus } from "@/features/audits/api/types/audit"

function createAuditSession(): AuditSession {
  const status: SessionStatus = faker.number.int({ min: 0, max: 100 }) < 25
    ? "active"
    : "closed"
  const startedAt = faker.date.recent({ days: 30 })
  const endedAt =
    status === "closed"
      ? faker.date.soon({ days: 1, refDate: startedAt })
      : null

  return {
    id: faker.string.uuid(),
    authorName: faker.person.fullName(),
    authorAvatarUrl: faker.datatype.boolean(0.7)
      ? faker.image.avatarGitHub()
      : null,
    authorVerified: faker.datatype.boolean(0.8),
    ip: faker.internet.ipv4(),
    startedAt: startedAt.toISOString(),
    endedAt: endedAt ? endedAt.toISOString() : null,
    status,
  }
}

faker.seed(20260715)

export const auditsDb: AuditSession[] = Array.from(
  { length: 140 },
  createAuditSession
)
