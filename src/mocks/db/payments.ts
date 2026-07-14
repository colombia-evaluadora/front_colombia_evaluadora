import { faker } from "@faker-js/faker"
import type { Payment, PaymentStatus } from "@/features/payments/api/types/payment"

// Distribución realista: la mayoría de pagos terminan bien, pocos fallan.
const STATUS_WEIGHTS: [PaymentStatus, number][] = [
  ["success", 55],
  ["pending", 20],
  ["processing", 15],
  ["failed", 10],
]

function pickStatus(): PaymentStatus {
  const total = STATUS_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = faker.number.float({ min: 0, max: total })
  for (const [status, weight] of STATUS_WEIGHTS) {
    if (roll < weight) return status
    roll -= weight
  }
  return "success"
}

function createPayment(): Payment {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    status: pickStatus(),
    amount: faker.number.float({ min: 12.5, max: 5000, fractionDigits: 2 }),
    createdAt: faker.date.past({ years: 1 }).toISOString(),
  }
}

faker.seed(20260714)

export const paymentsDb: Payment[] = Array.from({ length: 180 }, createPayment)
