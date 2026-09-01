import { http, HttpResponse, delay } from "msw"

import {
  deleteActividadById,
  planeadorDb,
} from "@/mocks/db/planeador"
import { unidadesTematicasDb } from "@/mocks/db/unidades-tematicas"
import { getCalificacionesByActividad } from "@/mocks/db/calificaciones"

import type {
  ExportFormat,
  ExportResult,
} from "@/features/planeador/api/types/actividad"
import { EXPORT_FORMAT_LABELS } from "@/features/planeador/api/types/actividad"

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
const ACTIVIDAD_DELETE_URL = "/api/eval-col/planeador/actividad/:id"
const ACTIVIDAD_EXPORT_URL = "/api/eval-col/planeador/actividad/export/:id"
const ACTIVIDAD_EXPORT_ALL_URL = "/api/eval-col/planeador/actividad/export-all"
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

  // ───────────────────────────────────────────────────────────────────────
  // Mutaciones (delete / export). Mismo patrón que el módulo de Cobertura:
  // el body / params viajan en la mutación, el handler devuelve el sobre
  // `{status, message}` y el cliente decide qué tostar.
  // ───────────────────────────────────────────────────────────────────────

  // Borrado: 404 si la actividad no existe, igual que el GET de detalle.
  // Ojo con el orden de las rutas: `:id` matchea cualquier string, así que
  // tiene que ir DESPUÉS de las específicas (`/export/:id`, `/export-all`)
  // para que MSW no las capture como "actividad con id = 'export-all'".
  http.delete(ACTIVIDAD_DELETE_URL, async ({ params }) => {
    await delay(250)
    const id = String(params.id)
    const found = planeadorDb.find((row) => row.id === id)
    if (!found) {
      return HttpResponse.json<ExportResult>(
        { status: "error", message: "Actividad no encontrada." },
        { status: 404 },
      )
    }

    deleteActividadById(id)

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: "Actividad eliminada correctamente.",
    })
  }),

  // Export individual: recibe `{format}` y devuelve el mensaje listo para
  // tostar. 404 si el id no existe (mismo criterio que delete).
  http.post(ACTIVIDAD_EXPORT_URL, async ({ params, request }) => {
    await delay(500)

    const id = String(params.id)
    const found = planeadorDb.find((row) => row.id === id)
    if (!found) {
      return HttpResponse.json<ExportResult>(
        { status: "error", message: "Actividad no encontrada." },
        { status: 404 },
      )
    }

    const { format } = (await request.json()) as { format: ExportFormat }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `Actividad exportada a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  // Export general: el cliente manda el array ya filtrado (mismo shape que
  // `matricula/export-all`). El mensaje reporta cuántas filas se exportaron
  // para que el toast sea informativo sin abrir el archivo generado (el
  // mock no genera el archivo real).
  http.post(ACTIVIDAD_EXPORT_ALL_URL, async ({ request }) => {
    await delay(600)

    const { filters, format } = (await request.json()) as {
      filters: { id: string; nombre: string }[]
      format: ExportFormat
    }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${filters.length} actividad(es) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),
]