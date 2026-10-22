import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Contra el backend REAL (sin mocks): es el que tiene PATCH de ficha y PUT de
// permisos separados, y donde se duplicaba la escritura.
vi.mock("@/config/env", () => ({
  env: { API_URL: "http://localhost/api", ENABLE_API_MOCKING: false, APP_URL: "http://localhost", NAME: "TEST" },
}))
// El interceptor de axios lee `window.location`; en node no existe.
vi.stubGlobal("window", { location: { pathname: "/app", href: "/app" } })
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const { api } = await import("@/lib/api-client")
const { saveEmployeeChanges } = await import(
  "@/features/establishment/employees/api/mutations/save-employee-changes"
)
const { buildEmployeeDataSnapshot } = await import(
  "@/features/establishment/employees/components/dialogs/dialog-manage/helpers"
)

import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { Permission } from "@/features/establishment/institution/api/types/permission"

const BASE = "http://localhost/api"
api.defaults.baseURL = BASE
const EMPLOYEE_ID = 77

const calls: { method: string; path: string; body: unknown }[] = []
const server = setupServer(
  http.patch(`${BASE}/eval-col/establecimientos/funcionarios/:id`, async ({ request }) => {
    calls.push({ method: "PATCH", path: new URL(request.url).pathname, body: await request.json() })
    return HttpResponse.json({ rows: [{ fn_fun_actualizar: EMPLOYEE_ID }] })
  }),
  http.put(`${BASE}/eval-col/funcionario/:id/permisos`, async ({ request }) => {
    const body = (await request.json()) as { permisos: { accion: string; id?: number }[] }
    calls.push({ method: "PUT", path: new URL(request.url).pathname, body })
    return HttpResponse.json({
      rows: body.permisos.map((item, index) => ({ accion: item.accion, id: item.id ?? 900 + index, status: "ok" })),
    })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
beforeEach(() => {
  calls.length = 0
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const catalog = (id: number, name: string) => ({ id, code: String(id), name })

const permisoExistente: Permission = {
  id: 501,
  order: 1,
  role: catalog(9, "Docente"),
  campus: { id: 3, name: "Sede principal" } as Permission["campus"],
  workSchedule: catalog(1, "Mañana"),
  status: "ACTIVE",
}

function loadedEmployee(): Employee {
  return {
    id: EMPLOYEE_ID,
    person: {
      documentType: catalog(1, "CC"),
      identification: "1000000001",
      firstName: "QA",
      middleName: "",
      lastName: "Funcionario",
      secondLastName: "",
      birthDate: "",
      gender: null,
      email: "qa@example.com",
      phone: "",
    },
    employeeClass: null,
    educationLevel: null,
    grade: null,
    highestEducationLevel: null,
    fundingSource: null,
    functionalPosition: null,
    employmentType: null,
    address: "Calle 1",
    permissions: [permisoExistente],
    status: "ACTIVE",
  }
}

/** Replica lo que hace `handleMainSave`: decide el PATCH comparando la ficha contra la carga. */
function save(original: Employee, edited: Employee) {
  const additional = (e: Employee) => ({
    employeeClass: e.employeeClass,
    educationLevel: e.educationLevel,
    grade: e.grade,
    highestEducationLevel: e.highestEducationLevel,
    fundingSource: e.fundingSource,
    functionalPosition: e.functionalPosition,
    employmentType: e.employmentType,
    address: e.address,
  })
  return saveEmployeeChanges({
    employeeId: EMPLOYEE_ID,
    values: edited,
    employeeDataChanged:
      buildEmployeeDataSnapshot(edited.person, additional(edited)) !==
      buildEmployeeDataSnapshot(original.person, additional(original)),
    originalPermissionIds: new Set(original.permissions.map((p) => p.id!)),
    permissionsChanged: JSON.stringify(edited.permissions) !== JSON.stringify(original.permissions),
    foto: null,
    removePhoto: false,
  })
}

describe("saveEmployeeChanges (guardado único del funcionario)", () => {
  it("solo información complementaria → 1 PATCH y ningún PUT de permisos", async () => {
    const original = loadedEmployee()
    const edited = { ...loadedEmployee(), address: "Carrera 9 # 10-11", grade: catalog(14, "Grado 14") }

    const result = await save(original, edited)

    expect(calls.map((c) => c.method)).toEqual(["PATCH"])
    expect(calls[0].path).toBe(`/api/eval-col/establecimientos/funcionarios/${EMPLOYEE_ID}`)
    expect(calls[0].body).toMatchObject({ address: "Carrera 9 # 10-11", grade: { id: 14 } })
    // Los permisos nunca viajan en el PATCH (no están declarados en la query).
    expect(calls[0].body).not.toHaveProperty("permissions")
    expect(result).toMatchObject({ status: "ok", patched: true, permissions: null })
  })

  it("datos personales + permisos → 1 PATCH y luego 1 PUT, en ese orden", async () => {
    const original = loadedEmployee()
    const nuevo: Permission = { ...permisoExistente, id: undefined, order: 2, workSchedule: catalog(2, "Tarde") }
    const edited: Employee = {
      ...loadedEmployee(),
      person: { ...loadedEmployee().person, phone: "3001234567" },
      permissions: [nuevo],
    }

    const result = await save(original, edited)

    expect(calls.map((c) => c.method)).toEqual(["PATCH", "PUT"])
    expect(calls[1].path).toBe(`/api/eval-col/funcionario/${EMPLOYEE_ID}/permisos`)
    expect(calls[1].body).toEqual({
      permisos: [
        { accion: "eliminar", id: 501 },
        { accion: "crear", orden: 2, fk_rol: 9, fk_sede: 3, fk_jornada: 2, fk_estado: "ACTIVO" },
      ],
    })
    expect(result.status).toBe("ok")
    if (result.status === "ok") {
      expect(result.permissions?.failures).toEqual([])
      expect(result.permissions?.permissions[0].id).toBe(901)
      expect([...(result.permissions?.originalPermissionIds ?? [])]).toEqual([901])
    }
  })

  it("solo permisos → 1 PUT y ningún PATCH (ni su notificación)", async () => {
    const original = loadedEmployee()
    const edited: Employee = { ...loadedEmployee(), permissions: [] }

    await save(original, edited)

    expect(calls.map((c) => c.method)).toEqual(["PUT"])
  })

  it("sin cambios → 0 llamadas", async () => {
    const result = await save(loadedEmployee(), loadedEmployee())

    expect(calls).toHaveLength(0)
    expect(result).toMatchObject({ status: "ok", patched: false, permissions: null })
  })

  it("si el PATCH falla no se tocan los permisos", async () => {
    server.use(
      http.patch(`${BASE}/eval-col/establecimientos/funcionarios/:id`, () =>
        HttpResponse.json({ message: "Conflict: ERROR: no autorizado" }, { status: 409 }),
      ),
    )
    const edited: Employee = {
      ...loadedEmployee(),
      address: "Otra",
      permissions: [],
    }

    await expect(save(loadedEmployee(), edited)).rejects.toBeTruthy()
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(0)
  })
})
