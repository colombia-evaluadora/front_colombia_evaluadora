import { http, HttpResponse, delay } from "msw"
import { faker } from "@faker-js/faker"

import { paymentsDb } from "../db/payments"
import type {
  Payment,
  PaymentsQueryRequest,
  PaymentsQueryResponse,
} from "@/features/payments/api/types/payment"
import type { PaymentFormValues } from "@/features/payments/api/schema"

function applyFilters(rows: Payment[], filters: PaymentsQueryRequest["filters"]): Payment[] {
  return rows.filter((row) => {
    if (filters.email && !row.email.toLowerCase().includes(filters.email.toLowerCase())) {
      return false
    }
    if (filters.status?.length && !filters.status.includes(row.status)) {
      return false
    }
    if (filters.amountMin != null && row.amount < filters.amountMin) {
      return false
    }
    if (filters.amountMax != null && row.amount > filters.amountMax) {
      return false
    }
    return true
  })
}

function applySorting(rows: Payment[], sorting: PaymentsQueryRequest["sorting"]): Payment[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = a[id as keyof Payment]
    const bv = b[id as keyof Payment]
    if (av === bv) return 0
    return av > bv ? 1 : -1
  })
  return desc ? sorted.reverse() : sorted
}

export const paymentsHandlers = [
  http.post("/api/payments/query", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as PaymentsQueryRequest
    const { filters, sorting, pageIndex, pageSize } = body

    const filtered = applySorting(applyFilters(paymentsDb, filters), sorting)
    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<PaymentsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/payments", async ({ request }) => {
    await delay(300)
    const values = (await request.json()) as PaymentFormValues
    const payment: Payment = {
      id: faker.string.uuid(),
      email: values.email,
      amount: values.amount,
      status: values.status,
      createdAt: new Date().toISOString(),
    }
    paymentsDb.unshift(payment)
    return HttpResponse.json({ status: "ok", message: "Pago creado." })
  }),

  http.patch("/api/payments/:id", async ({ request, params }) => {
    await delay(300)
    const values = (await request.json()) as PaymentFormValues
    const index = paymentsDb.findIndex((p) => p.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ status: "error", message: "Pago no encontrado." }, { status: 404 })
    }
    paymentsDb[index] = { ...paymentsDb[index], ...values }
    return HttpResponse.json({ status: "ok", message: "Pago actualizado." })
  }),

  http.delete("/api/payments/:id", async ({ params }) => {
    await delay(300)
    const index = paymentsDb.findIndex((p) => p.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ status: "error", message: "Pago no encontrado." }, { status: 404 })
    }
    paymentsDb.splice(index, 1)
    return HttpResponse.json({ status: "ok", message: "Pago eliminado." })
  }),

  http.post("/api/payments/bulk-delete", async ({ request }) => {
    await delay(300)
    const ids = (await request.json()) as string[]
    const idSet = new Set(ids)
    let removed = 0
    for (let i = paymentsDb.length - 1; i >= 0; i--) {
      if (idSet.has(paymentsDb[i].id)) {
        paymentsDb.splice(i, 1)
        removed += 1
      }
    }
    return HttpResponse.json({
      status: "ok",
      message: `${removed} pago(s) eliminado(s).`,
    })
  }),

  http.post("/api/payments/delete-all", async ({ request }) => {
    await delay(300)
    const filters = (await request.json()) as PaymentsQueryRequest["filters"]
    const toRemove = new Set(applyFilters(paymentsDb, filters).map((p) => p.id))
    for (let i = paymentsDb.length - 1; i >= 0; i--) {
      if (toRemove.has(paymentsDb[i].id)) paymentsDb.splice(i, 1)
    }
    return HttpResponse.json({
      status: "ok",
      message: `${toRemove.size} pago(s) eliminado(s).`,
    })
  }),
]
