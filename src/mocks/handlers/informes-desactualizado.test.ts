import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import { informesHandlers } from "@/mocks/handlers/informes"
import { MENSAJE_INFORME_DESACTUALIZADO } from "@/features/academic-management/reports/api/query/use-informe-desactualizado-query"

// Regla 71: el informe emitido antes de una aprobación queda marcado hasta que
// se reemite; reemitir la planilla de OTRA asignatura no lo limpia.

const server = setupServer(...informesHandlers)

// Los handlers de Informes usan rutas relativas (`/api/...`): MSW las resuelve
// contra `location.href`, que en el entorno node no existe.
beforeAll(() => {
  vi.stubGlobal("location", new URL("http://localhost/"))
  server.listen()
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

const BASE = "http://localhost/api/eval-col/informes"

async function desactualizado(grupo: number, periodo: number) {
  const res = await fetch(`${BASE}/desactualizado?grupo=${grupo}&periodo=${periodo}`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as {
    rows: { informe: { desactualizado: boolean; mensaje: string | null; cambios: { asignatura: string }[] } }[]
  }
  return body.rows[0].informe
}

async function guardarPlanilla(asignatura: number) {
  const res = await fetch(`${BASE}/planilla/guardar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ FK_TGRUPO: 502, FK_TASIGNATURA: asignatura, FK_TPERIODO_EVALUACION: 201, MATRICULAS: null }),
  })
  expect(res.ok).toBe(true)
}

describe("GET /informes/desactualizado (mock)", () => {
  it("un informe sin aprobaciones posteriores no está marcado", async () => {
    const informe = await desactualizado(502, 202)
    expect(informe.desactualizado).toBe(false)
    expect(informe.mensaje).toBeNull()
  })

  it("marca 502-201 con el texto exacto de la Regla 71 y lo limpia al reemitir la planilla afectada", async () => {
    const antes = await desactualizado(502, 201)
    expect(antes.desactualizado).toBe(true)
    expect(antes.mensaje).toBe(MENSAJE_INFORME_DESACTUALIZADO)
    expect(antes.cambios.map((c) => c.asignatura)).toEqual(["Matemáticas"])

    await guardarPlanilla(4402)
    expect((await desactualizado(502, 201)).desactualizado).toBe(true)

    await guardarPlanilla(4401)
    expect((await desactualizado(502, 201)).desactualizado).toBe(false)
  })
})

describe("POST /informes/planilla (mock)", () => {
  it("la actividad con Refuerzo trae la nota original y la del refuerzo", async () => {
    const res = await fetch(`${BASE}/planilla`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ FK_TGRUPO: 502, FK_TASIGNATURA: 4401, FK_TPERIODO_EVALUACION: 203, SEARCH: null }),
    })
    const { rows } = (await res.json()) as {
      rows: { fk_tmatricula: number; actividades: { orden: number; nota: number; notaOriginal?: number; notaRefuerzo?: number }[] }[]
    }
    const celda = rows.find((r) => r.fk_tmatricula === 9101)!.actividades.find((a) => a.orden === 1)!
    expect(celda).toMatchObject({ notaOriginal: 3, notaRefuerzo: 4.5, nota: 4.5 })
    const otra = rows.find((r) => r.fk_tmatricula !== 9101)!.actividades.find((a) => a.orden === 1)!
    expect(otra.notaRefuerzo).toBeUndefined()
  })
})
