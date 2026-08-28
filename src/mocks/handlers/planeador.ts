import { http, HttpResponse, delay } from "msw"

import { planeadorDb } from "@/mocks/db/planeador"
import { unidadesTematicasDb } from "@/mocks/db/unidades-tematicas"
import { getCalificacionesByActividad } from "@/mocks/db/calificaciones"

/**
 * Endpoints del Planeador bajo `/api/eval-col` — mismo prefijo que el resto
 * del microservicio (roles, menús, planes). El path se duplica acá con la
 * forma `/api/eval-col/...` (en lugar del helper `apiPath(mock, real)` que
 * usan otros handlers) porque hoy solo existe el mock: si mañana hay ruta
 * real, se sustituye la constante por una llamada a `apiPath`.
 */
const ACTIVIDAD_LIST_URL = "/api/eval-col/planeador/actividad/query"
const ACTIVIDAD_DETAIL_URL = "/api/eval-col/planeador/actividad/detalle/:id"
const ACTIVIDAD_CALIFICACIONES_URL =
  "/api/eval-col/planeador/actividad/calificaciones/:id"
const UNIDAD_LIST_URL = "/api/eval-col/planeador/unidad/query"
const UNIDAD_DETAIL_URL = "/api/eval-col/planeador/unidad/detalle/:id"

export const planeadorHandlers = [
  // Listado: el cliente (`evalCol.getRows`) desenvuelve el sobre `{rows: [...]}`.
  http.get(ACTIVIDAD_LIST_URL, async () => {
    await delay(150)
    return HttpResponse.json({
      rows: planeadorDb,
      pageCount: 1,
      totalCount: planeadorDb.length,
    })
  }),

  // Detalle: id desconocido → 404 con mensaje. El cliente espera el sobre
  // `{rows: [actividad]}` para mantener paridad con `evalCol.getRows` aunque
  // solo traiga una fila.
  http.get(ACTIVIDAD_DETAIL_URL, async ({ params }) => {
    await delay(120)
    const id = String(params.id)
    const found = planeadorDb.find((row) => row.id === id)
    if (!found) {
      return HttpResponse.json(
        { message: "Actividad no encontrada." },
        { status: 404 },
      )
    }
    return HttpResponse.json({ rows: [found] })
  }),

  // Calificaciones de la actividad: una fila por estudiante con asistencia
  // y notas por criterio. Mismo sobre `{rows: [...]}` que el resto, para
  // que `evalCol.getRows` lo desempaquete sin casos especiales.
  http.get(ACTIVIDAD_CALIFICACIONES_URL, async ({ params }) => {
    await delay(120)
    const id = String(params.id)
    const actividad = planeadorDb.find((row) => row.id === id)
    if (!actividad) {
      return HttpResponse.json(
        { message: "Actividad no encontrada." },
        { status: 404 },
      )
    }
    return HttpResponse.json({
      rows: getCalificacionesByActividad(id, planeadorDb),
    })
  }),

  // Unidades temáticas: mismo par listado/detalle y el mismo sobre, para que
  // el cliente las consuma con `evalCol.getRows` sin casos especiales.
  http.get(UNIDAD_LIST_URL, async () => {
    await delay(150)
    return HttpResponse.json({
      rows: unidadesTematicasDb,
      pageCount: 1,
      totalCount: unidadesTematicasDb.length,
    })
  }),

  http.get(UNIDAD_DETAIL_URL, async ({ params }) => {
    await delay(120)
    const id = String(params.id)
    const found = unidadesTematicasDb.find((row) => row.id === id)
    if (!found) {
      return HttpResponse.json(
        { message: "Unidad temática no encontrada." },
        { status: 404 },
      )
    }
    return HttpResponse.json({ rows: [found] })
  }),
]