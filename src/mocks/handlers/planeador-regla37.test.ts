import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import { MENSAJE_ACTIVIDAD_NO_EDITABLE } from "@/features/planeador/lib/actividad-editable"
import { getCalificacionesByActividad } from "@/mocks/db/calificaciones"
import { planeadorDb } from "@/mocks/db/planeador"
import { pkTactividadEstudianteDe } from "@/mocks/db/planilla"

// Regla 37 en el mock (paridad con sso V492.3/V496.1/V553): con resultados la
// actividad no se edita por ningún camino y los listados lo dicen por fila.
// Seed: 601 tiene 12 evaluados y está en la unidad 1; 602 no tiene ninguno.

// Los handlers del planeador usan rutas relativas ("/api/eval-col/..."): en node
// MSW las resuelve contra `location`, que no existe.
vi.stubGlobal("location", new URL("http://localhost/app/planeador"))
const { planeadorHandlers } = await import("@/mocks/handlers/planeador")
const { planeadorPlanillaHandlers } = await import("@/mocks/handlers/planeador/planilla")

const server = setupServer(...planeadorHandlers, ...planeadorPlanillaHandlers)
const API = "http://localhost/api/eval-col/planeador"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

async function put(url: string, body: unknown) {
  return fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
}

describe("lecturas", () => {
  it("el detalle trae el motivo cuando la actividad ya tiene resultados", async () => {
    const calificada = await (await fetch(`${API}/actividades/601`)).json()
    expect(calificada.rows[0].motivoNoEditable).toBe(MENSAJE_ACTIVIDAD_NO_EDITABLE)
    const libre = await (await fetch(`${API}/actividades/602`)).json()
    expect(libre.rows[0].motivoNoEditable).toBeUndefined()
  })

  it("mias y las actividades de la unidad traen editable/motivo_no_editable por fila", async () => {
    const mias = await (await fetch(`${API}/actividades/mias?size=100&offset=0`)).json()
    const fila601 = mias.rows.find((r: { pk_tactividad: number }) => r.pk_tactividad === 601)
    const fila602 = mias.rows.find((r: { pk_tactividad: number }) => r.pk_tactividad === 602)
    expect(fila601).toMatchObject({ editable: "N", motivo_no_editable: MENSAJE_ACTIVIDAD_NO_EDITABLE })
    expect(fila602).toMatchObject({ editable: "S", motivo_no_editable: null })

    const unidad = await (await fetch(`${API}/unidades/1/actividades`)).json()
    expect(unidad.rows.find((r: { pk_tactividad: number }) => r.pk_tactividad === 601)).toMatchObject({
      editable: "N",
    })
  })
})

describe("escrituras de una actividad calificada", () => {
  it.each([
    ["PUT de la actividad", () => put(`${API}/actividades/601`, { nombre: "x" })],
    ["materiales", () => put(`${API}/actividades/601/materiales`, { MATERIALES: "[]" })],
    ["adaptaciones", () => put(`${API}/actividades/601/adaptaciones`, { ADAPTACIONES: "[]" })],
    ["estudiantes", () => put(`${API}/actividades/601/estudiantes`, { FK_TMATRICULAS: [] })],
    ["instrumento", () => put(`${API}/actividades/601/instrumento`, { DEFINICION: "{}" })],
    ["peso en la unidad", () => put(`${API}/unidades/actividades/601/ponderacion`, { PONDERACION: 40 })],
    ["desvincular de la unidad", () => fetch(`${API}/unidades/actividades/601`, { method: "PATCH" })],
    [
      "evidencia",
      () =>
        fetch(`${API}/actividades/601/evidencias`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ FK_REFERENTE_ENUNCIADO: 1 }),
        }),
    ],
  ])("%s: 409 con el motivo", async (_caso, enviar) => {
    const res = await enviar()
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: "FK_NOT_FOUND", message: MENSAJE_ACTIVIDAD_NO_EDITABLE })
  })

  it("una actividad sin resultados se edita; al calificarla queda bloqueada", async () => {
    expect((await put(`${API}/actividades/602`, { nombre: "Editable" })).status).toBe(200)

    // Un estudiante con asistencia: sin ella el mock (como el real) no deja calificar.
    const estudiante = getCalificacionesByActividad(602, planeadorDb).find((e) => e.asistencia.estado !== "no-asistio")!
    const pk = pkTactividadEstudianteDe(602, estudiante.id)
    const calificar = await put(`${API}/actividades/estudiantes/${pk}/calificar`, {
      CALIFICACION: JSON.stringify({ valorNumerico: 4 }),
      FECHA: "2026-08-20",
    })
    expect(calificar.status).toBe(200)

    const res = await put(`${API}/actividades/602`, { nombre: "Ya no" })
    expect(res.status).toBe(409)
    const detalle = await (await fetch(`${API}/actividades/602`)).json()
    expect(detalle.rows[0].motivoNoEditable).toBe(MENSAJE_ACTIVIDAD_NO_EDITABLE)
  })
})
