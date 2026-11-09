import { setupServer } from "msw/node"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/config/env", () => ({
  env: {
    API_URL: "http://localhost/api",
    ENABLE_API_MOCKING: false,
    APP_URL: "http://localhost",
    NAME: "TEST",
    GEOCODER_URL: "https://nominatim.openstreetmap.org/search",
  },
}))
// El interceptor de axios lee `window.location`; en node no existe.
// Los handlers usan rutas relativas ("/api/..."): MSW las resuelve contra este origen.
vi.stubGlobal("location", new URL("http://localhost/app"))
vi.stubGlobal("window", { location: { pathname: "/app", href: "http://localhost/app" } })
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const { api } = await import("@/lib/api-client")
const { academicPeriodsHandlers } = await import("@/mocks/handlers/academic-period/academic-periods")
const { academicPeriodsDb } = await import("@/mocks/db/academic-period/academic-periods")
const { fetchPreviousCycle } = await import(
  "@/features/establishment/academic-period/api/query/use-previous-cycle-query"
)

api.defaults.baseURL = "http://localhost/api"
const server = setupServer(...academicPeriodsHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

// Sede del período 6 sembrado (Trimestral ciclo 1, jornada Mañana, 2026).
const sedeId = academicPeriodsDb.find((p) => p.id === 6)!.sedeId
const base = { sedeId, jornadaId: 1, startDate: "2026-04-27", modality: "TRIMESTRAL" as const }

describe("ciclo anterior (Regla 96)", () => {
  it("encuentra el ciclo 1 al crear el ciclo 2", async () => {
    const previous = await fetchPreviousCycle({ ...base, cycle: 2 })
    expect(previous?.id).toBe(6)
  })

  it("no hay ciclo anterior si falta el ciclo inmediatamente previo", async () => {
    expect(await fetchPreviousCycle({ ...base, cycle: 3 })).toBeNull()
  })

  it("no cruza modalidades ni años", async () => {
    expect(await fetchPreviousCycle({ ...base, modality: "BIMESTRAL", cycle: 2 })).toBeNull()
    expect(await fetchPreviousCycle({ ...base, startDate: "2027-04-26", cycle: 2 })).toBeNull()
  })
})
