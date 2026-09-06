import { http, HttpResponse, delay } from "msw"

import {
  addActividad,
  deleteActividadById,
  planeadorDb,
} from "@/mocks/db/planeador"
import {
  addActividadToUnidad,
  addCriterioToUnidad,
  addUnidad,
  deleteUnidadById,
  unidadesTematicasDb,
  updateUnidadInfoGeneral,
} from "@/mocks/db/unidades-tematicas"
import { getCalificacionesByActividad } from "@/mocks/db/calificaciones"

import type {
  Actividad,
  ExportFormat,
  ExportResult,
} from "@/features/planeador/api/types/actividad"
import { EXPORT_FORMAT_LABELS } from "@/features/planeador/api/types/actividad"
import type { NivelDesempenoCriterio, UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

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
const ACTIVIDAD_CREATE_URL = "/api/eval-col/planeador/actividad"
const ACTIVIDAD_DELETE_URL = "/api/eval-col/planeador/actividad/:id"
const ACTIVIDAD_EXPORT_URL = "/api/eval-col/planeador/actividad/export/:id"
const ACTIVIDAD_EXPORT_ALL_URL = "/api/eval-col/planeador/actividad/export-all"
const UNIDAD_LIST_URL = "/api/eval-col/planeador/unidad/query"
const UNIDAD_DETAIL_URL = "/api/eval-col/planeador/unidad/detalle/:id"
const UNIDAD_CRITERIO_CREATE_URL = "/api/eval-col/planeador/unidad/:id/criterio"
const UNIDAD_ACTIVIDAD_LINK_URL = "/api/eval-col/planeador/unidad/:id/actividad"
const UNIDAD_CREATE_URL = "/api/eval-col/planeador/unidad"
const UNIDAD_UPDATE_URL = "/api/eval-col/planeador/unidad/:id"
const UNIDAD_DELETE_URL = "/api/eval-col/planeador/unidad/:id"

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

  // Agregar criterio a la rúbrica de una unidad. El diálogo manda los 5
  // campos de texto (sin id); acá se le asigna uno y se empuja al array en
  // memoria de la unidad. 404 si la unidad no existe.
  http.post(UNIDAD_CRITERIO_CREATE_URL, async ({ params, request }) => {
    await delay(250)
    const id = String(params.id)
    const body = (await request.json()) as {
      nombre: string
      niveles: NivelDesempenoCriterio[]
    }
    const created = addCriterioToUnidad(id, body)
    if (!created) {
      return HttpResponse.json(
        { status: "error", message: "Unidad temática no encontrada." },
        { status: 404 },
      )
    }
    return HttpResponse.json({ status: "ok", criterio: created })
  }),

  // Vincula una actividad ya existente a la unidad, con su peso. 404 si la
  // unidad no existe, 409 si esa actividad ya estaba vinculada (evita el
  // duplicado si el usuario hace doble click en "Vincular").
  http.post(UNIDAD_ACTIVIDAD_LINK_URL, async ({ params, request }) => {
    await delay(250)
    const id = String(params.id)
    const body = (await request.json()) as {
      actividadId: string
      nombre: string
      tipo: string
      instrumento: string
      grupo: string
      ponderacion: number
    }
    const created = addActividadToUnidad(id, body)
    if (created === null) {
      return HttpResponse.json(
        { status: "error", message: "Unidad temática no encontrada." },
        { status: 404 },
      )
    }
    if (created === "duplicado") {
      return HttpResponse.json(
        { status: "error", message: "Esa actividad ya está vinculada a esta unidad." },
        { status: 409 },
      )
    }
    return HttpResponse.json({ status: "ok", actividad: created })
  }),

  // Creación: el cliente manda solo "Información general" (sin
  // criterios/actividades — esas se agregan después, ya con la unidad
  // guardada, desde la página de edición). Acá se le asigna el `id` real
  // y arrancan vacías.
  http.post(UNIDAD_CREATE_URL, async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Omit<UnidadTematica, "id" | "criterios" | "actividades">
    const created: UnidadTematica = { ...body, id: crypto.randomUUID(), criterios: [], actividades: [] }
    addUnidad(created)
    return HttpResponse.json(created)
  }),

  // Edita los campos de "Información general" de la unidad (todo menos
  // criterios/actividades, que se editan aparte). 404 si no existe.
  http.put(UNIDAD_UPDATE_URL, async ({ params, request }) => {
    await delay(250)
    const id = String(params.id)
    const body = (await request.json()) as Omit<UnidadTematica, "id" | "criterios" | "actividades">
    const updated = updateUnidadInfoGeneral(id, body)
    if (!updated) {
      return HttpResponse.json(
        { status: "error", message: "Unidad temática no encontrada." },
        { status: 404 },
      )
    }
    return HttpResponse.json({ status: "ok", unidad: updated })
  }),

  // Borrado de la unidad. 404 si no existe, igual que el de actividad.
  http.delete(UNIDAD_DELETE_URL, async ({ params }) => {
    await delay(250)
    const id = String(params.id)
    const found = unidadesTematicasDb.find((row) => row.id === id)
    if (!found) {
      return HttpResponse.json<ExportResult>(
        { status: "error", message: "Unidad temática no encontrada." },
        { status: 404 },
      )
    }

    deleteUnidadById(id)

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: "Unidad temática eliminada correctamente.",
    })
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Mutaciones (delete / export). Mismo patrón que el módulo de Cobertura:
  // el body / params viajan en la mutación, el handler devuelve el sobre
  // `{status, message}` y el cliente decide qué tostar.
  // ───────────────────────────────────────────────────────────────────────

  // Creación: el cliente manda la actividad completa (el form arranca de un
  // objeto vacío armado en el cliente); acá se le asigna el `id` real y se
  // agrega al frente del listado en memoria.
  http.post(ACTIVIDAD_CREATE_URL, async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Actividad
    const created: Actividad = { ...body, id: crypto.randomUUID() }
    addActividad(created)
    return HttpResponse.json(created)
  }),

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