import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

// El front de sedes tiene un solo camino (rutas reales); el mock las imita.
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

const { toInfluenceArea } = await import("@/features/establishment/campuses/lib/geo")
const { geocodeCampusAddress } = await import("@/features/establishment/campuses/api/query/geocode")

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
      location: "10.470000,-73.250000",
      influenceArea: null,
    })
    const detalle = await fetchCampus(id)
    expect(detalle.consecutive).toBe(String(consecutivo))
    expect(detalle.isPrincipal).toBe(false)
    expect(detalle.workSchedules.map((j) => j.id)).toEqual([1, 2])

    await expect(
      createCampus({ ...{ establishmentId: ee, name: "Otra", dane: "999000000002", zoneId: 11 }, consecutive: String(consecutivo), neighborhood: "", commune: "", address: "", phone: "", workScheduleIds: [1], location: "10.47,-73.25", influenceArea: null }),
    ).rejects.toSatisfy((error) => status(error) === 409)
  })

  it("una anexa nueva sin ubicación no se crea (Regla 89)", async () => {
    const { rows } = await lista()
    const error = await createCampus({
      establishmentId: rows[0].establishmentId,
      consecutive: "",
      name: "Sin ubicación",
      dane: "999000000009",
      zoneId: 11,
      neighborhood: "",
      commune: "",
      address: "",
      phone: "",
      workScheduleIds: [1],
      location: "",
      influenceArea: null,
    }).catch((e) => e)
    expect(status(error)).toBe(400)
  })

  it("en la principal solo manda zona, jornadas, ubicación y el área si cambió", async () => {
    let body: Record<string, unknown> | null = null
    const area = toInfluenceArea([[10.47, -73.26], [10.47, -73.25], [10.48, -73.25]])
    server.use(
      http.patch("*/api/eval-col/establecimientos/sedes/:id", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ rows: [{ pk_sede_actualizada: 1 }] })
      }),
    )
    await updateCampus({
      campusId: 1,
      isPrincipal: true,
      values: { establishmentId: 1, consecutive: "1", name: "X", dane: "1", zoneId: 11, neighborhood: "", commune: "", address: "", phone: "", workScheduleIds: [1], location: "10.5,-73.2", influenceArea: area },
      originalInfluenceArea: null,
    })
    expect(body).toEqual({ zone: 11, workSchedules: [1], georeference: "10.5,-73.2", influenceArea: JSON.stringify(area) })

    // Sin cambios en el área no viaja; quitarla manda "null".
    await updateCampus({
      campusId: 1,
      isPrincipal: true,
      values: { establishmentId: 1, consecutive: "1", name: "X", dane: "1", zoneId: 11, neighborhood: "", commune: "", address: "", phone: "", workScheduleIds: [1], location: "", influenceArea: area },
      originalInfluenceArea: area,
    })
    expect(body).toEqual({ zone: 11, workSchedules: [1], georeference: null })
    await updateCampus({
      campusId: 1,
      isPrincipal: true,
      values: { establishmentId: 1, consecutive: "1", name: "X", dane: "1", zoneId: 11, neighborhood: "", commune: "", address: "", phone: "", workScheduleIds: [1], location: "", influenceArea: null },
      originalInfluenceArea: area,
    })
    expect(body).toEqual({ zone: 11, workSchedules: [1], georeference: null, influenceArea: "null" })
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

const { fetchEstablishmentCampuses } = await import("@/features/establishment/campuses/api/query/use-establishment-campuses")
const { fetchCampusProcesses, describeCampusProcesses } = await import(
  "@/features/establishment/campuses/api/query/use-campus-processes"
)
const { convertCampus } = await import("@/features/establishment/campuses/api/mutations/convert-campus")
const { fetchSedeOptions, sedesParaRegistroNuevo } = await import(
  "@/features/establishment/academic-period/api/query/use-sede-options"
)

describe("opciones de sedes para registros nuevos", () => {
  it("traen estado y jornadas; los registros nuevos solo ofrecen las activas (y la ya elegida)", async () => {
    const sedes = await fetchSedeOptions()
    expect(sedes.every((s) => (s.estado === "A" || s.estado === "I") && (s.jornadas?.length ?? 0) > 0)).toBe(true)
    const inactiva = sedes.find((s) => s.estado === "I")!
    expect(sedesParaRegistroNuevo(sedes).some((s) => s.pk_sede === inactiva.pk_sede)).toBe(false)
    expect(sedesParaRegistroNuevo(sedes, String(inactiva.pk_sede)).some((s) => s.pk_sede === inactiva.pk_sede)).toBe(true)
  })
})

describe("cambiar establecimiento", () => {
  it("describe los procesos en curso como en el informe", async () => {
    expect(describeCampusProcesses(await fetchCampusProcesses(4))).toBe("12 inscripciones y 1 período académico abierto")
    expect(describeCampusProcesses(await fetchCampusProcesses(3))).toBeNull()
  })

  it("mueve una anexa a otro establecimiento sin repetir su consecutivo", async () => {
    const { rows } = await lista()
    const anexa = rows.find((r) => !r.isPrincipal && r.status === "A")!
    const destino = rows.find((r) => r.establishmentId !== anexa.establishmentId)!.establishmentId
    const detalle = await fetchCampus(anexa.id)
    const valores = {
      establishmentId: destino,
      consecutive: "1",
      name: detalle.name,
      dane: detalle.dane,
      zoneId: detalle.zoneId,
      neighborhood: detalle.neighborhood,
      commune: detalle.commune,
      address: detalle.address,
      phone: detalle.phone,
      workScheduleIds: detalle.workSchedules.map((j) => j.id),
      location: detalle.location,
      influenceArea: detalle.influenceArea,
    }
    // El 1 es de la principal del destino.
    const error = await updateCampus({ campusId: anexa.id, values: valores, isPrincipal: false, moveTo: destino }).catch((e) => e)
    expect(status(error)).toBe(409)

    const libre = String(await fetchNextConsecutive(destino))
    await updateCampus({ campusId: anexa.id, values: { ...valores, consecutive: libre }, isPrincipal: false, moveTo: destino })
    const sedesDestino = await fetchEstablishmentCampuses(destino)
    expect(sedesDestino.find((s) => s.id === anexa.id)?.consecutive).toBe(libre)
  })

  it("convierte una anexa en establecimiento: queda como su principal", async () => {
    const { rows } = await lista()
    const anexa = rows.find((r) => !r.isPrincipal)!
    const valores = {
      basicInfo: { name: "IE Nueva", dane: "168001000999", nit: "900765432-6", ownershipType: { id: 1, code: "", name: "" }, serviceModality: { id: 2, code: "", name: "" } },
      address: { municipality: null, zone: null, district: null, commune: null, locality: null, address: "" },
      contact: { email: "", website: "", phone: "" },
      additionalInfo: { calendar: { id: 3, code: "", name: "A" } } as never,
      principal: { id: 10 } as never,
      secretary: null,
    }
    const id = await convertCampus({ campusId: anexa.id, values: valores })
    const sedes = await fetchEstablishmentCampuses(id)
    expect(sedes).toEqual([expect.objectContaining({ id: anexa.id, consecutive: "1" })])
    // Sin rector no se convierte.
    const error = await convertCampus({ campusId: rows.find((r) => !r.isPrincipal && r.id !== anexa.id)!.id, values: { ...valores, principal: null } }).catch((e) => e)
    expect(status(error)).toBe(400)
  })
})

describe("ubicación y área de influencia", () => {
  it("el detalle trae la ubicación (pendiente en la principal) y el área", async () => {
    const { rows } = await lista()
    const principal = await fetchCampus(rows.find((r) => r.isPrincipal)!.id)
    expect(principal.location).toBe("")
    const conArea = await fetchCampus(4)
    expect(conArea.location).toMatch(/^10\.\d+,-73\.\d+$/)
    expect(conArea.influenceArea?.type).toBe("Polygon")
  })

  it("ubica con la dirección y, si no la encuentra, con el barrio", async () => {
    vi.stubGlobal("sessionStorage", undefined)
    const exacta = await geocodeCampusAddress({ address: "Calle 10 # 4-20", neighborhood: "Centro", municipality: "Valledupar" })
    expect(exacta).toEqual({ location: [10.4736, -73.2539], precision: "address" })
    const barrio = await geocodeCampusAddress({ address: "Calle sin mapa 1", neighborhood: "Novalito", municipality: "Valledupar" })
    expect(barrio?.precision).toBe("neighborhood")
    const nada = await geocodeCampusAddress({ address: "Calle sin mapa 2", neighborhood: "", municipality: "" })
    expect(nada).toBeNull()
  })
})
