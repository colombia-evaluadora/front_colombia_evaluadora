import { http, HttpResponse, delay } from "msw"

import type { Plan } from "@/features/administration/roles-menus/api/types/role-menu"

import { plansDb } from "@/mocks/db/plans"

export const plansHandlers = [
  http.get("/api/plans", async () => {
    await delay(150)
    return HttpResponse.json<Plan[]>(plansDb)
  }),

  http.post("/api/plans", async ({ request }) => {
    await delay(200)
    const { name } = (await request.json()) as { name: string }
    const trimmed = name.trim()

    if (!trimmed) {
      return HttpResponse.json({ message: "El nombre del plan es obligatorio." }, { status: 400 })
    }
    if (plansDb.some((plan) => plan.name.toLowerCase() === trimmed.toLowerCase())) {
      return HttpResponse.json({ message: "Ya existe un plan con ese nombre." }, { status: 409 })
    }

    const plan: Plan = { id: Math.max(0, ...plansDb.map((it) => it.id)) + 1, name: trimmed }
    plansDb.push(plan)
    return HttpResponse.json<Plan>(plan, { status: 201 })
  }),
]
