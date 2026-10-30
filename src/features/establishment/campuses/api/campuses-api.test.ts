import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

// El front de sedes tiene un solo camino (rutas reales); el mock las imita.
vi.mock("@/config/env", () => ({
  env: { API_URL: "http://localhost/api", ENABLE_API_MOCKING: false, APP_URL: "http://localhost", NAME: "TEST" },
}))
// El interceptor de axios lee `window.location`; en node no existe.
vi.stubGlobal("window", { location: { pathname: "/app", href: "/app" } })
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const { api } = await import("@/lib/api-client")
const { campusHandlers } = await import("@/mocks/handlers/campuses")
const { fetchCampuses } = await import("@/features/establishment/campuses/api/query/use-campuses")
const { fetchCampus } = await import("@/features/establishment/campuses/api/query/use-campus")
const { fetchNextConsecutive } = await import("@/features/establishment/campuses/api/query/use-establishment-campuses")
const { createCampus, updateCampus } = await import("@/features/establishment/campuses/api/mutations/create")
const { changeCampusStatus } = await import("@/features/establishment/campuses/api/mutations/change-status")
const { fetchCampusSpecialties, fetchSpecialtyCatalog } = await import(
  "@/features/establishment/campuses/api/query/use-campus-specialties"
)
const { saveCampusSpecialty, deleteCampusSpecialty } = await import(
  "@/features/establishment/campuses/api/mutations/specialties"
)

api.defaults.baseURL = "http://localhost/api"
const server = setupServer(...campusHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const lista = (filters = {}) => fetchCampuses({ filters, sorting: [], pageIndex: 0, pageSize: 50 })
const status = (error: unknown) => (error as { response?: { status?: number } }).response?.status

describe("listado de sedes", () => {
  it("trae consecutivo, jornadas y estado, y marca la principal", async () => {
    const { rows, totalCount } = await lista()
    expect(totalCount).toBe(rows.length)
    expect(rows.some((r) => r.isPrincipal && r.consecutive === "1")).toBe(true)
    expect(rows.every((r) => r.workSchedules.length > 0)).toBe(true)
  })

  it("filtra por estado y por establecimiento", async () => {
    const inactivas = await lista({ statuses: ["I"] })
    expect(inactivas.rows.length).toBeGreaterThan(0)
    expect(inactivas.rows.every((r) => r.status === "I")).toBe(true)
    const { rows } = await lista()
    const ee = rows[0].establishmentId
    const delEe = await lista({ establishments: [ee] })
    expect(delEe.rows.every((r) => r.establishmentId === ee)).toBe(true)
  })
})

describe("crear y editar", () => {
  it("crea una sede anexa con el consecutivo sugerido y sus jornadas", async () => {
    const { rows } = await lista()
    const ee = rows[0].establishmentId
    const consecutivo = await fetchNextConsecutive(ee)
    expect(consecutivo).toBeGreaterThanOrEqual(2)

    const id = await createCampus({
      establishmentId: ee,
      consecutive: String(consecutivo),
      name: "Sede de prueba",
      dane: "999000000001",
      zoneId: 11,
      neighborhood: "",
      commune: "",
      address: "",
      phone: "",
      workScheduleIds: [1, 2],
    })
    const detalle = await fetchCampus(id)
    expect(detalle.consecutive).toBe(String(consecutivo))
    expect(detalle.isPrincipal).toBe(false)
    expect(detalle.workSchedules.map((j) => j.id)).toEqual([1, 2])

    await expect(
      createCampus({ ...{ establishmentId: ee, name: "Otra", dane: "999000000002", zoneId: 11 }, consecutive: String(consecutivo), neighborhood: "", commune: "", address: "", phone: "", workScheduleIds: [1] }),
    ).rejects.toSatisfy((error) => status(error) === 409)
  })

  it("en la principal solo manda zona y jornadas", async () => {
    let body: Record<string, unknown> | null = null
    server.use(
      http.patch("*/api/eval-col/establecimientos/sedes/:id", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ rows: [{ pk_sede_actualizada: 1 }] })
      }),
    )
    await updateCampus({
      campusId: 1,
      isPrincipal: true,
      values: { establishmentId: 1, consecutive: "1", name: "X", dane: "1", zoneId: 11, neighborhood: "", commune: "", address: "", phone: "", workScheduleIds: [1] },
    })
    expect(body).toEqual({ zone: 11, workSchedules: [1] })
  })
})

describe("activar e inactivar", () => {
  it("la principal con período abierto no se inactiva (409); una anexa sí", async () => {
    const { rows } = await lista()
    const principal = rows.find((r) => r.isPrincipal)!
    await expect(changeCampusStatus({ campusId: principal.id, status: "I" })).rejects.toSatisfy(
      (error) => status(error) === 409,
    )
    const anexa = rows.find((r) => !r.isPrincipal && r.status === "A")!
    await changeCampusStatus({ campusId: anexa.id, status: "I" })
    expect((await fetchCampus(anexa.id)).status).toBe("I")
  })
})

describe("catálogo de especialidades de la sede", () => {
  it("agrega, no repite y no elimina una especialidad en uso", async () => {
    const catalogo = await fetchSpecialtyCatalog()
    const otra = catalogo.find((c) => c.isOther)!
    const comercial = catalogo.find((c) => c.name === "Comercial")!
    // El mock siembra el catálogo de las sedes 1 y 2.
    const campusId = 1

    await saveCampusSpecialty({
      campusId,
      specialtyItemId: null,
      values: { characterId: otra.characterId, specialtyId: otra.id, ownName: "Agroindustria", status: "A" },
      isOther: true,
    })
    const items = await fetchCampusSpecialties(campusId)
    expect(items.some((i) => i.ownName === "Agroindustria")).toBe(true)

    await expect(
      saveCampusSpecialty({
        campusId,
        specialtyItemId: null,
        values: { characterId: otra.characterId, specialtyId: otra.id, ownName: "agroindustria", status: "A" },
        isOther: true,
      }),
    ).rejects.toSatisfy((error) => status(error) === 409)

    const enUso = items.find((i) => i.specialtyId === comercial.id)!
    await expect(deleteCampusSpecialty({ campusId, specialtyItemId: enUso.id })).rejects.toSatisfy(
      (error) => status(error) === 409,
    )
    const libre = items.find((i) => i.ownName === "Agroindustria")!
    await deleteCampusSpecialty({ campusId, specialtyItemId: libre.id })
    expect((await fetchCampusSpecialties(campusId)).some((i) => i.id === libre.id)).toBe(false)
  })
})
