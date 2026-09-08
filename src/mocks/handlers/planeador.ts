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
  unlinkActividadFromUnidad,
  updatePonderacionActividad,
  updateUnidadInfoGeneral,
} from "@/mocks/db/unidades-tematicas"
import { nextId } from "@/mocks/db/next-id"
import { getCalificacionesByActividad } from "@/mocks/db/calificaciones"

import type {
  Actividad,
  ExportFormat,
  ExportResult,
} from "@/features/planeador/api/types/actividad"
import { EXPORT_FORMAT_LABELS } from "@/features/planeador/api/types/actividad"
import type { NivelDesempenoCriterio, UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { statusToEstadoDerivado } from "@/features/planeador/lib/estado-derivado"

/**
 * Endpoints del Planeador bajo `/api/eval-col` — mismo prefijo que el resto
 * del microservicio (roles, menús, planes). El path se duplica acá con la
 * forma `/api/eval-col/...` (en lugar del helper `apiPath(mock, real)` que
 * usan otros handlers) porque hoy solo existe el mock: si mañana hay ruta
 * real, se sustituye la constante por una llamada a `apiPath`.
 *
 * URLs y verbos calcados de las colecciones Postman del contrato real
 * (`planeador-unidad`/`planeador-actividad`, `query-service eval-col`):
 * rutas plurales (`/actividades`, `/unidades`), sin `DELETE` (el motor solo
 * admite GET/POST/PUT/PATCH — los borrados/desvinculaciones son `PATCH`), y
 * paginación explícita por `size`/`offset` en los listados.
 */
const ACTIVIDAD_LIST_URL = "/api/eval-col/planeador/actividades"
// Registrados ANTES que `ACTIVIDAD_DETAIL_URL` (`/actividades/:id`): MSW
// matchea por orden de registro, no por especificidad, así que si
// `:id` fuera antes, "stats"/"calendario"/"mias" calzarían ahí como si
// fueran un id — mismo cuidado que las rutas estáticas vs. dinámicas de
// TanStack Router.
const ACTIVIDAD_STATS_URL = "/api/eval-col/planeador/actividades/stats"
const ACTIVIDAD_CALENDARIO_URL = "/api/eval-col/planeador/actividades/calendario"
const ACTIVIDAD_MIAS_URL = "/api/eval-col/planeador/actividades/mias"
const ACTIVIDAD_DETAIL_URL = "/api/eval-col/planeador/actividades/:id"
const ACTIVIDAD_CALIFICACIONES_URL =
  "/api/eval-col/planeador/actividades/:id/calificaciones"
const ACTIVIDAD_CREATE_URL = "/api/eval-col/planeador/actividades"
const ACTIVIDAD_DELETE_URL = "/api/eval-col/planeador/actividades/:id"
const ACTIVIDAD_EXPORT_URL = "/api/eval-col/planeador/actividades/:id/export"
const ACTIVIDAD_EXPORT_ALL_URL = "/api/eval-col/planeador/actividades/export-all"
const UNIDAD_LIST_URL = "/api/eval-col/planeador/unidades"
const UNIDAD_DETAIL_URL = "/api/eval-col/planeador/unidades/:id"
const UNIDAD_CRITERIO_CREATE_URL = "/api/eval-col/planeador/unidades/:id/criterios"
const UNIDAD_VALORACIONES_URL = "/api/eval-col/planeador/unidades/:id/valoraciones"
const UNIDAD_REFERENTE_URL = "/api/eval-col/planeador/unidades/:id/referente"
const UNIDAD_ACTIVIDADES_VINCULADAS_URL = "/api/eval-col/planeador/unidades/:id/actividades"
const UNIDAD_ACTIVIDADES_DISPONIBLES_URL =
  "/api/eval-col/planeador/unidades/:id/actividades-disponibles"
const UNIDAD_ACTIVIDAD_LINK_URL =
  "/api/eval-col/planeador/unidades/:id/actividades/:actividadId"
const UNIDAD_ACTIVIDAD_UNLINK_URL = "/api/eval-col/planeador/unidades/actividades/:actividadId"
const UNIDAD_ACTIVIDAD_PONDERACION_URL =
  "/api/eval-col/planeador/unidades/actividades/:actividadId/ponderacion"
const UNIDAD_CREATE_URL = "/api/eval-col/planeador/unidades"
const UNIDAD_UPDATE_URL = "/api/eval-col/planeador/unidades/:id"
const UNIDAD_DELETE_URL = "/api/eval-col/planeador/unidades/:id"

/**
 * Recorta `rows` según `?size=`/`?offset=` de la query string (el contrato
 * real los exige explícitos — devuelve 500 si faltan; acá, al ser mock, se
 * usa el total como default en vez de fallar). Devuelve también el sobre de
 * paginación (`pageCount`/`totalCount`) que ya espera `evalCol.getRows`.
 */
function paginate<T>(rows: T[], url: URL) {
  const total = rows.length
  const size = Number(url.searchParams.get("size") ?? total) || total || 1
  const offset = Number(url.searchParams.get("offset") ?? 0) || 0
  return {
    rows: rows.slice(offset, offset + size),
    pageCount: Math.max(1, Math.ceil(total / size)),
    totalCount: total,
  }
}

export const planeadorHandlers = [
  // Listado: el cliente (`evalCol.getRows`) desenvuelve el sobre `{rows: [...]}`.
  // Paginado por `size`/`offset`, igual que `GET /planeador/actividades` real.
  http.get(ACTIVIDAD_LIST_URL, async ({ request }) => {
    await delay(150)
    const page = paginate(planeadorDb, new URL(request.url))
    return HttpResponse.json(page)
  }),

  // Stats del docente (cards de resumen). Contadores sobre TODO
  // `planeadorDb`, no sobre lo que devuelva `/mias` filtrado — mismo
  // criterio que el real: el universo no cambia con el buscador de abajo.
  http.get(ACTIVIDAD_STATS_URL, async () => {
    await delay(150)
    const counts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
    for (const row of planeadorDb) {
      if (row.status === "pending") counts.pending++
      else if (row.status === "in-progress") counts.in_progress++
      else if (row.status === "completed") counts.completed++
      else if (row.status === "cancelled") counts.cancelled++
    }
    return HttpResponse.json({ rows: [counts] })
  }),

  // Calendario mensual: filtra por solapamiento `[fechaInicio, fechaCierre]`
  // contra `[fecha_desde, fecha_hasta]` (comparación lexicográfica, ambas
  // `yyyy-MM-dd`) y resuelve `fecha` como día de anclaje — el inicio si cae
  // dentro del rango pedido, si no el propio `fecha_desde` (la actividad ya
  // venía abierta de un mes anterior).
  http.get(ACTIVIDAD_CALENDARIO_URL, async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const fechaDesde = url.searchParams.get("fecha_desde") ?? ""
    const fechaHasta = url.searchParams.get("fecha_hasta") ?? ""
    const rows = planeadorDb
      .filter((row) => row.fechaInicio <= fechaHasta && row.fechaCierre >= fechaDesde)
      .map((row) => ({
        fecha: row.fechaInicio >= fechaDesde ? row.fechaInicio : fechaDesde,
        fecha_inicio: row.fechaInicio,
        fecha_cierre: row.fechaCierre,
        pk_tactividad: row.id,
        titulo: row.nombre,
        grupo: row.grupo,
        asignatura: row.asignatura,
        area: null,
        estado: statusToEstadoDerivado(row.status),
      }))
    return HttpResponse.json({ rows })
  }),

  // Listado del docente para el rail izquierdo: `search` filtra por
  // nombre/asignatura/grupo, `estados` es una lista separada por coma de
  // estados DERIVADOS (`PENDIENTE_POR_EVALUAR`, …) — se traduce de vuelta a
  // `ActividadStatus` para filtrar `planeadorDb`, que guarda el status en
  // el formato del front.
  http.get(ACTIVIDAD_MIAS_URL, async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase()
    const estadosParam = url.searchParams.get("estados")
    const estadosDerivados = estadosParam ? estadosParam.split(",") : null

    const filtered = planeadorDb.filter((row) => {
      if (estadosDerivados && !estadosDerivados.includes(statusToEstadoDerivado(row.status))) {
        return false
      }
      if (!search) return true
      return [row.nombre, row.asignatura, row.grupo, row.tipo]
        .join(" ")
        .toLowerCase()
        .includes(search)
    })

    const page = paginate(filtered, url)
    const rows = page.rows.map((row) => ({
      pk_tactividad: row.id,
      titulo: row.nombre,
      estado: statusToEstadoDerivado(row.status),
      fecha_inicio: row.fechaInicio,
      fecha_cierre: row.fechaCierre,
      asignatura: row.asignatura,
      grupo: row.grupo,
      unidad: row.unidad.nombre || null,
      instrumento_evaluacion: row.instrumento,
      ponderacion: row.ponderacion,
      es_evaluativa: row.esEvaluativa ? "S" : "N",
      estudiantes_asignados: row.totalEstudiantes,
      estudiantes_evaluados: row.evaluados,
      total_count: page.totalCount,
    }))
    return HttpResponse.json({ rows })
  }),

  // Detalle: id desconocido → 404 con mensaje. El cliente espera el sobre
  // `{rows: [actividad]}` para mantener paridad con `evalCol.getRows` aunque
  // solo traiga una fila.
  http.get(ACTIVIDAD_DETAIL_URL, async ({ params }) => {
    await delay(120)
    const id = Number(params.id)
    const found = planeadorDb.find((row) => row.id === id)
    if (!found) {
      return HttpResponse.json(
        { message: "Actividad no encontrada." },
        { status: 404 },
      )
    }
    return HttpResponse.json({ rows: [found] })
  }),

  // Edición parcial de la actividad — el mock, a diferencia del real, no
  // hace merge campo por campo: reemplaza con lo que mandó el form entero
  // (que ya trae la actividad completa, editada), mismo criterio que
  // `updateUnidadInfoGeneral`.
  http.put(ACTIVIDAD_DETAIL_URL, async ({ params, request }) => {
    await delay(250)
    const id = Number(params.id)
    const index = planeadorDb.findIndex((row) => row.id === id)
    if (index === -1) {
      return HttpResponse.json({ message: "Actividad no encontrada." }, { status: 404 })
    }
    const body = (await request.json()) as Actividad
    planeadorDb[index] = { ...planeadorDb[index], ...body, id }
    return HttpResponse.json({ status: "ok", actividad: planeadorDb[index] })
  }),

  // Calificaciones de la actividad: una fila por estudiante con asistencia
  // y notas por criterio. Mismo sobre `{rows: [...]}` que el resto, para
  // que `evalCol.getRows` lo desempaquete sin casos especiales.
  http.get(ACTIVIDAD_CALIFICACIONES_URL, async ({ params }) => {
    await delay(120)
    const id = Number(params.id)
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
  http.get(UNIDAD_LIST_URL, async ({ request }) => {
    await delay(150)
    const page = paginate(unidadesTematicasDb, new URL(request.url))
    return HttpResponse.json(page)
  }),

  http.get(UNIDAD_DETAIL_URL, async ({ params }) => {
    await delay(120)
    const id = Number(params.id)
    const found = unidadesTematicasDb.find((row) => row.id === id)
    if (!found) {
      return HttpResponse.json(
        { message: "Unidad temática no encontrada." },
        { status: 404 },
      )
    }
    return HttpResponse.json({ rows: [found] })
  }),

  // Agregar criterio a la rúbrica de una unidad. El diálogo manda los
  // campos de texto (sin id); acá se le asigna uno y se empuja al array en
  // memoria de la unidad. 404 si la unidad no existe.
  http.post(UNIDAD_CRITERIO_CREATE_URL, async ({ params, request }) => {
    await delay(250)
    const id = Number(params.id)
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

  // Valoraciones activas de la escala que aplica a la unidad — paso previo
  // a "Agregar criterio" real (3.3 exige un nivel por cada una). El mock no
  // replica la derivación real (asignatura+grado → escala del periodo):
  // devuelve directo las 4 bandas por default, alcanza para poder probar
  // el modal en mock.
  http.get(UNIDAD_VALORACIONES_URL, async () => {
    await delay(150)
    const rows = ["Bajo", "Básico", "Alto", "Superior"].map((valoracion_nombre, index) => ({
      pk_tescala_valoracion: index + 1,
      valoracion_nombre,
      limite_inferior: null,
      limite_superior: null,
      nota_minima: null,
      nota_maxima: null,
      valoracion_simbolo: null,
      valoracion_carita: null,
    }))
    return HttpResponse.json({ rows })
  }),

  // Referente curricular de la unidad — el mock deriva el enfoque directo
  // del propio `enfoquePedagogico` de la unidad (ya lo trae el seed), sin
  // replicar el recorrido real grado → nivel de enseñanza → referente.
  http.get(UNIDAD_REFERENTE_URL, async ({ params }) => {
    await delay(150)
    const id = Number(params.id)
    const unidad = unidadesTematicasDb.find((row) => row.id === id)
    if (!unidad) {
      return HttpResponse.json({ message: "Unidad temática no encontrada." }, { status: 404 })
    }
    return HttpResponse.json({
      rows: [
        {
          referente: { id: 1 },
          enfoque_valor: unidad.enfoquePedagogico === "Formativo" ? "FORMATIVO" : "EVALUATIVO",
          tipo_evaluacion_valor: "CUANTITATIVA_CUALITATIVA",
        },
      ],
    })
  }),

  // Actividades ya vinculadas a la unidad — el mock reusa `unidad.actividades`
  // (la lista de vínculos que ya tenía el modelo mock) pero reshapeada al
  // shape REAL de fila (`toUnidadActividad` en `use-unidad-actividades-query.ts`
  // espera snake_case, no el `UnidadActividad` del mock directo).
  http.get(UNIDAD_ACTIVIDADES_VINCULADAS_URL, async ({ params }) => {
    await delay(150)
    const id = Number(params.id)
    const unidad = unidadesTematicasDb.find((row) => row.id === id)
    if (!unidad) {
      return HttpResponse.json({ message: "Unidad temática no encontrada." }, { status: 404 })
    }
    const rows = unidad.actividades.map((a) => ({
      pk_tactividad: a.actividadId,
      titulo: a.nombre,
      es_evaluativa: a.tipo === "Sumativa" ? "S" : "N",
      instrumento_evaluacion: a.instrumento,
      grupo: a.grupo,
      ponderacion: a.ponderacion,
    }))
    return HttpResponse.json({ rows })
  }),

  // Actividades disponibles para vincular: las de `planeadorDb` que NO
  // aparecen todavía en el `actividades[]` de NINGUNA unidad — aproxima
  // "huérfana" para el mock (que no modela `FK_TUNIDAD` como el real).
  // `porcentaje_disponible` es el mismo para todas las filas: lo que le
  // queda a ESTA unidad, igual que calcularía el real para su grupo.
  http.get(UNIDAD_ACTIVIDADES_DISPONIBLES_URL, async ({ params, request }) => {
    await delay(150)
    const id = Number(params.id)
    const unidad = unidadesTematicasDb.find((row) => row.id === id)
    if (!unidad) {
      return HttpResponse.json({ message: "Unidad temática no encontrada." }, { status: 404 })
    }
    const url = new URL(request.url)
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase()
    const vinculadasIds = new Set(
      unidadesTematicasDb.flatMap((u) => u.actividades.map((a) => a.actividadId)),
    )
    const comprometido = unidad.actividades.reduce((acc, a) => acc + a.ponderacion, 0)
    const porcentajeDisponible = Math.max(0, 100 - comprometido)
    const rows = planeadorDb
      .filter((a) => !vinculadasIds.has(a.id))
      .filter((a) => !search || a.nombre.toLowerCase().includes(search))
      .map((a) => ({
        pk_tactividad: a.id,
        titulo: a.nombre,
        es_evaluativa: a.esEvaluativa ? "S" : "N",
        instrumento_evaluacion: a.instrumento,
        grupo: a.grupo,
        porcentaje_disponible: porcentajeDisponible,
      }))
    return HttpResponse.json({ rows })
  }),

  // Vincula una actividad ya existente a la unidad, con su peso. El id de la
  // actividad viaja en el path (`PUT .../actividades/:actividadId`, no en el
  // body) — mismo criterio que `fn_unidad_actividad_vincular` real. 404 si
  // la unidad no existe, 409 si esa actividad ya estaba vinculada (evita el
  // duplicado si el usuario hace doble click en "Vincular").
  // Body real: solo `PONDERACION`/`PERMITIR_MOVER_DE_UNIDAD` — el resto de
  // los campos que muestra la tabla (nombre/tipo/instrumento/grupo) se
  // derivan de `planeadorDb` dentro de `addActividadToUnidad`, no del body.
  http.put(UNIDAD_ACTIVIDAD_LINK_URL, async ({ params, request }) => {
    await delay(250)
    const id = Number(params.id)
    const actividadId = Number(params.actividadId)
    const body = (await request.json()) as { PONDERACION: number | null }
    const created = addActividadToUnidad(id, actividadId, body.PONDERACION ?? 0)
    if (created === null) {
      return HttpResponse.json(
        { status: "error", message: "Unidad o actividad no encontrada." },
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

  // Desvincular: la actividad vuelve a ser huérfana.
  http.patch(UNIDAD_ACTIVIDAD_UNLINK_URL, async ({ params }) => {
    await delay(200)
    const actividadId = Number(params.actividadId)
    const ok = unlinkActividadFromUnidad(actividadId)
    if (!ok) {
      return HttpResponse.json(
        { status: "error", message: "Esa actividad no está vinculada a ninguna unidad." },
        { status: 404 },
      )
    }
    return HttpResponse.json({ status: "ok" })
  }),

  // Edición rápida (inline) del peso de una actividad ya vinculada.
  http.put(UNIDAD_ACTIVIDAD_PONDERACION_URL, async ({ params, request }) => {
    await delay(200)
    const actividadId = Number(params.actividadId)
    const body = (await request.json()) as { PONDERACION: number }
    const ok = updatePonderacionActividad(actividadId, body.PONDERACION)
    if (!ok) {
      return HttpResponse.json(
        { status: "error", message: "Esa actividad no está vinculada a ninguna unidad." },
        { status: 404 },
      )
    }
    return HttpResponse.json({ status: "ok" })
  }),

  // Creación: el cliente manda solo "Información general" (sin
  // criterios/actividades — esas se agregan después, ya con la unidad
  // guardada, desde la página de edición). Acá se le asigna el `id` real
  // y arrancan vacías.
  http.post(UNIDAD_CREATE_URL, async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Omit<UnidadTematica, "id" | "criterios" | "actividades">
    const id = nextId(unidadesTematicasDb.map((u) => u.id))
    const created: UnidadTematica = { ...body, id, criterios: [], actividades: [] }
    addUnidad(created)
    return HttpResponse.json(created)
  }),

  // Edita los campos de "Información general" de la unidad (todo menos
  // criterios/actividades, que se editan aparte). 404 si no existe.
  http.put(UNIDAD_UPDATE_URL, async ({ params, request }) => {
    await delay(250)
    const id = Number(params.id)
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

  // Borrado (soft-delete) de la unidad. `PATCH`, no `DELETE` — el motor real
  // no admite ese verbo (`ck_query_http_method` solo permite GET/POST/PUT/
  // PATCH). 404 si no existe, igual que el de actividad.
  http.patch(UNIDAD_DELETE_URL, async ({ params }) => {
    await delay(250)
    const id = Number(params.id)
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
    const id = nextId(planeadorDb.map((a) => a.id))
    const created: Actividad = { ...body, id }
    addActividad(created)
    return HttpResponse.json(created)
  }),

  // Borrado (soft-delete): `PATCH`, no `DELETE` (ver nota de arriba). 404 si
  // la actividad no existe, igual que el GET de detalle. Ojo con el orden de
  // las rutas: `:id` matchea cualquier valor, así que tiene que ir DESPUÉS
  // de las específicas (`/export/...`, `/export-all`) para que MSW no las
  // capture como "actividad con id = 'export-all'".
  http.patch(ACTIVIDAD_DELETE_URL, async ({ params }) => {
    await delay(250)
    const id = Number(params.id)
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
  // tostar. 404 si el id no existe (mismo criterio que delete). Sin
  // equivalente en el contrato real (no documentado en las colecciones);
  // se mantiene bajo el mismo prefijo plural por consistencia.
  http.post(ACTIVIDAD_EXPORT_URL, async ({ params, request }) => {
    await delay(500)

    const id = Number(params.id)
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
      filters: { id: number; nombre: string }[]
      format: ExportFormat
    }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${filters.length} actividad(es) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),
]
