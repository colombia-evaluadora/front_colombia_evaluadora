import { delay, http, HttpResponse } from "msw"

import {
  aprobarSolicitud,
  configuracionActualizacion,
  guardarConfiguracion,
  listarSolicitudes,
  rechazarSolicitud,
} from "@/mocks/db/actualizacion-datos"

const BASE = "*/api/eval-col/cobertura-academica/actualizacion-datos"

const filas = (data: unknown) => HttpResponse.json({ rows: Array.isArray(data) ? data : [data] })
const resultado = (error: string | null) => (error ? HttpResponse.json({ message: error }, { status: 400 }) : filas({ ok: true }))

// Sección 2.19 (pendientes-back, tarea 30).
export const actualizacionDatosHandlers = [
  // Dos, para ver el selector que usan los roles territoriales; la configuración del mock es una sola.
  http.get(`${BASE}/establecimientos`, async () => {
    await delay(150)
    return filas([
      { id: 1, nombre: "Institución Educativa San José" },
      { id: 2, nombre: "Institución Educativa La Esperanza" },
    ])
  }),
  http.get(`${BASE}/configuracion`, async () => {
    await delay(200)
    return filas(configuracionActualizacion())
  }),
  http.put(`${BASE}/configuracion`, async ({ request }) => {
    await delay(400)
    return resultado(guardarConfiguracion((await request.json()) as Parameters<typeof guardarConfiguracion>[0]))
  }),
  http.post(`${BASE}/solicitudes/query`, async ({ request }) => {
    await delay(250)
    return filas(listarSolicitudes((await request.json()) as Parameters<typeof listarSolicitudes>[0]))
  }),
  http.put(`${BASE}/solicitudes/:id/aprobar`, async ({ params }) => {
    await delay(400)
    return resultado(aprobarSolicitud(Number(params.id)))
  }),
  http.put(`${BASE}/solicitudes/:id/rechazar`, async ({ params, request }) => {
    await delay(400)
    return resultado(rechazarSolicitud(Number(params.id), ((await request.json()) as { MOTIVO: string }).MOTIVO))
  }),
]
