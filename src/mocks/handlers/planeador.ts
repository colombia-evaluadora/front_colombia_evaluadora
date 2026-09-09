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
import type {
  ActividadExportada,
  FilaInformeImportacion,
} from "@/features/planeador/api/types/actividad-intercambio"
import { statusToEstadoDerivado } from "@/features/planeador/lib/estado-derivado"
import { parseLocalDate, toDateOnly } from "@/features/planeador/lib/format-date"
import { hashString } from "@/mocks/handlers/planeador/docentes"

/**
 * Emula el `grado_grupo` real (colección Postman `planeador-delta-cambios`,
 * punto 3): si el nombre del grupo ya empieza por el grado (`"803M"`) se usa
 * tal cual; si no (sembrados a mano, `"01"`) se compone con el grado
 * (`"Pre-Jardin 01"`). El mock no tiene un código de grado separado del
 * nombre, así que compara contra el nombre — suficiente para no repetir el
 * bug que este campo existe para evitar.
 */
function gradoGrupoMock(grado: string, grupo: string): string {
  if (!grado) return grupo
  if (!grupo) return grado
  return grupo.startsWith(grado) ? grupo : `${grado} ${grupo}`
}

// Mismo esquema de ids sintéticos por hash que `docentes/grupos` y
// `docentes/grado-asignatura` (`hashString`, ver mocks/handlers/planeador/
// docentes.ts) — `unidadesTematicasDb` solo guarda el nombre del grado/
// asignatura, no un id propio, así que se deriva acá para que
// `UnidadTematica.gradoId` exista en mock (lo necesita el filtrado por
// pestaña de `GET /unidades/tabs`, ver `use-unidades-tabs-query.ts`).
function gradoIdMock(grado: string): number {
  return hashString(`grado-${grado}`) % 1000000
}
function asignaturaIdMock(asignatura: string): number {
  return hashString(`asignatura-${asignatura}`) % 1000000
}

// Rótulos dinámicos de los dos niveles del árbol de referente curricular
// (colección Postman `planeador-flujo-unidad-actividad`: "Propósito"/
// "Imprescindible" en Preescolar, "Enunciado"/"Evidencia" en Primaria). El
// mock no modela "nivel educativo" aparte — se aproxima con el mismo campo
// que ya distingue las unidades formativas (Preescolar tiende a serlo) para
// que la UI tenga ALGO dinámico que mostrar en vez de un literal fijo.
function nivelEtiquetasMock(enfoquePedagogico: "Evaluativo" | "Formativo"): {
  nivel1: string
  nivel2: string
} {
  return enfoquePedagogico === "Formativo"
    ? { nivel1: "Propósito", nivel2: "Imprescindible" }
    : { nivel1: "Enunciado", nivel2: "Evidencia" }
}

// Evidencias (nivel 2) de ejemplo para un enunciado — el mock no tiene un
// catálogo real de evidencias por enunciado, así que arma un par de textos
// plausibles a partir del propio texto del enunciado, solo para que la
// sección de checkboxes de la actividad tenga algo real que ofrecer.
function evidenciasMock(enunciadoId: number, enunciadoTexto: string) {
  return [
    { pk: enunciadoId * 100 + 1, texto: `Aplica: ${enunciadoTexto}` },
    { pk: enunciadoId * 100 + 2, texto: `Refuerza: ${enunciadoTexto}` },
  ]
}

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
const ACTIVIDAD_EVIDENCIAS_URL = "/api/eval-col/planeador/actividades/:id/evidencias"
const ACTIVIDAD_CREATE_URL = "/api/eval-col/planeador/actividades"
const ACTIVIDAD_DELETE_URL = "/api/eval-col/planeador/actividades/:id"
const ACTIVIDAD_EXPORT_ALL_URL = "/api/eval-col/planeador/actividades/export-all"
const ACTIVIDAD_EXPORTAR_JSON_URL = "/api/eval-col/planeador/actividades/exportar"
const ACTIVIDAD_IMPORTAR_JSON_URL = "/api/eval-col/planeador/actividades/importar"
const UNIDAD_LIST_URL = "/api/eval-col/planeador/unidades"
// Registrada ANTES que `UNIDAD_DETAIL_URL` (`/unidades/:id`) por el mismo
// motivo que `ACTIVIDAD_STATS_URL`/etc. arriba: si no, "tabs" calzaría ahí
// como si fuera un id.
const UNIDAD_TABS_URL = "/api/eval-col/planeador/unidades/tabs"
const UNIDAD_DETAIL_URL = "/api/eval-col/planeador/unidades/:id"
const UNIDAD_CRITERIO_CREATE_URL = "/api/eval-col/planeador/unidades/:id/criterios"
const UNIDAD_VALORACIONES_URL = "/api/eval-col/planeador/unidades/:id/valoraciones"
const UNIDAD_REFERENTE_URL = "/api/eval-col/planeador/unidades/:id/referente"
const REFERENTE_CURRICULAR_URL = "/api/eval-col/planeador/referente-curricular"
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

/** Ventana `[inicio, cierre]` (`yyyy-MM-dd`) de una fila con actividad
 *  propia, o de una unidad (derivada del min/max de sus actividades
 *  vinculadas — igual que el backend real, que no guarda fechas propias en
 *  la unidad). `null` cuando no hay ventana que evaluar (unidad sin
 *  actividades vinculadas). */
interface Ventana {
  inicio: string
  cierre: string
}

function estaVigente(ventana: Ventana | null, dia: string): boolean {
  return ventana != null && ventana.inicio <= dia && ventana.cierre >= dia
}

/** Día ocupado (alguna `ventana` lo cubre) más cercano a `desde`, saltando
 *  los vacíos, en la dirección pedida — mismo contrato que `dia_anterior`/
 *  `dia_siguiente` del backend real. Acota la búsqueda a ~2 años para no
 *  loopear para siempre si no queda ninguno de ese lado. */
function diaOcupadoCercano(
  ventanas: (Ventana | null)[],
  desde: string,
  direccion: 1 | -1,
): string | null {
  const base = parseLocalDate(desde)
  if (!base) return null
  for (let i = 1; i <= 730; i++) {
    const candidato = new Date(base)
    candidato.setDate(candidato.getDate() + i * direccion)
    const candidatoStr = toDateOnly(candidato)
    if (ventanas.some((v) => estaVigente(v, candidatoStr))) return candidatoStr
  }
  return null
}

/**
 * Paginado por "día activo" (`?dia=`, colecciones Postman `planeador-unidad`
 * 2.1 y `planeador-actividad` 4.1/8.3): filtra `rows` a las vigentes ese día
 * y calcula `dia_anterior`/`dia_siguiente`. Sin `dia`, no filtra y deja los
 * tres campos en `null` — mismo contrato que el real ("nada cambia").
 */
function filtrarPorDiaActivo<T>(
  rows: T[],
  ventanaDe: (row: T) => Ventana | null,
  dia: string | null,
): { rows: T[]; dia: string | null; diaAnterior: string | null; diaSiguiente: string | null } {
  if (!dia) return { rows, dia: null, diaAnterior: null, diaSiguiente: null }
  const ventanas = rows.map(ventanaDe)
  return {
    rows: rows.filter((_row, i) => estaVigente(ventanas[i]!, dia)),
    dia,
    diaAnterior: diaOcupadoCercano(ventanas, dia, -1),
    diaSiguiente: diaOcupadoCercano(ventanas, dia, 1),
  }
}

/**
 * `Actividad` (mock) → `ActividadExportada` (formato de intercambio real).
 * No es una traducción exhaustiva de cada campo del ejemplo capturado en la
 * colección Postman —el mock no diferencia rúbrica/cotejo/escala con la
 * misma fidelidad que el backend real—, alcanza para poder probar el
 * roundtrip exportar → importar en modo mock.
 */
function toActividadExportada(actividad: Actividad): ActividadExportada {
  const instrumentoLower = actividad.instrumento?.toLowerCase() ?? ""
  const esRubrica = instrumentoLower.includes("rúbrica") || instrumentoLower.includes("rubrica")
  const esCotejo = instrumentoLower.includes("cotejo")
  const esEscala = instrumentoLower.includes("escala")

  const exportada: ActividadExportada = {
    tipo: actividad.tipo,
    grado: actividad.grado,
    grupo: actividad.grupo,
    creado: new Date().toISOString(),
    nombre: actividad.nombre,
    semana: actividad.semana,
    unidad: actividad.unidad.nombre || null,
    duracion: actividad.duracionEstimada,
    recursos: actividad.recursos.map((recurso) => ({
      url: recurso.url,
      origen: "url",
      descripcion: recurso.descripcion,
    })),
    modalidad: actividad.modalidad,
    asignatura: actividad.asignatura,
    evaluativa: actividad.esEvaluativa ? "Si" : "No",
    materiales: actividad.materiales,
    descripcion: actividad.observaciones,
    instrumento: actividad.instrumento,
    adaptaciones: actividad.adaptaciones,
    fecha_inicio: actividad.fechaInicio,
    fecha_entrega: actividad.fechaCierre,
    observaciones: actividad.observaciones,
    tipo_evidencia: actividad.tipoEvidencia,
    genera_evidencias: actividad.generaEvidencias ? "Si" : "No",
    requiere_validacion: actividad.requiereValidacion ? "Si" : "No",
    _identificadores: {
      pkTactividad: actividad.id,
      ...(actividad.unidad.id !== 0 ? { pkTunidad: actividad.unidad.id } : {}),
    },
  }

  if (actividad.esEvaluativa) exportada.ponderacion = actividad.ponderacion

  if (esRubrica) {
    exportada.rubrica = actividad.rubrica.criterios.map((criterio) => ({
      nombre: criterio.nombre,
      niveles: [
        ...criterio.niveles.map((nivel) => ({
          nombre: nivel.nombre,
          descriptor: nivel.descripcion,
          ponderacion: nivel.ponderacion ?? 0,
        })),
        {
          nombre: "Excelente",
          descriptor: criterio.excelente,
          ponderacion: criterio.excelentePonderacion ?? 100,
        },
      ],
    }))
  } else if (esCotejo) {
    exportada.cotejo = actividad.listaCotejo.items.map((item) => item.descripcion)
  } else if (esEscala) {
    exportada.escala =
      actividad.escalaValoracion.tipo === "Numérica"
        ? {
            minimo: actividad.escalaValoracion.valorMinimo,
            maximo: actividad.escalaValoracion.valorMaximo,
            interpretacion: actividad.escalaValoracion.interpretacionRangos,
          }
        : actividad.escalaValoracion.niveles.map((nivel) => ({
            nombre: nivel.nombre,
            descriptor: nivel.descripcion,
            ponderacion: nivel.ponderacion ?? 0,
          }))
  }

  if (actividad.unidad.id !== 0) {
    exportada.unidad_meta = {
      nombre: actividad.unidad.nombre,
      objetivos: actividad.objetivos,
      contenidos: actividad.contenidos,
      descripcion: actividad.descripcionUnidad,
    }
  }

  return exportada
}

/**
 * Arma una `Actividad` completa con defaults vacíos para todos los campos
 * que el formato de intercambio no trae (recursos/rúbrica/adaptaciones de
 * detalle) — el importar real solo exige lo mínimo para crearla; el resto
 * queda como el form los inicializaría para una actividad nueva.
 */
function actividadFromImportRow(raw: Record<string, unknown>, id: number): Actividad {
  const nombre = String(raw.nombre ?? `Actividad ${id}`)
  const esEvaluativa = raw.evaluativa === "Si" || raw.evaluativa === "Sí"
  return {
    id,
    nombre,
    tipo: String(raw.tipo ?? ""),
    esRecuperacion: false,
    unidad: { id: 0, nombre: String(raw.unidad ?? "") },
    evidenciasIds: [],
    asignatura: String(raw.asignatura ?? ""),
    grado: String(raw.grado ?? ""),
    grupo: String(raw.grupo ?? ""),
    fechaInicio: String(raw.fecha_inicio ?? ""),
    fechaCierre: String(raw.fecha_entrega ?? ""),
    status: "pending",
    evaluados: 0,
    totalEstudiantes: 0,
    materiales: String(raw.materiales ?? ""),
    recursos: [],
    duracionEstimada: String(raw.duracion ?? ""),
    semana: String(raw.semana ?? ""),
    modalidad: (raw.modalidad as Actividad["modalidad"]) ?? "Presencial",
    esEvaluativa,
    instrumento: String(raw.instrumento ?? ""),
    ponderacion: esEvaluativa ? Number(raw.ponderacion ?? 0) : 0,
    generaEvidencias: raw.genera_evidencias === "Si" || raw.genera_evidencias === "Sí",
    tipoEvidencia: String(raw.tipo_evidencia ?? ""),
    requiereValidacion: raw.requiere_validacion === "Si" || raw.requiere_validacion === "Sí",
    observaciones: String(raw.observaciones ?? raw.descripcion ?? ""),
    contenidos: [],
    objetivos: [],
    descripcionUnidad: [],
    rubrica: { id: 0, criterios: [] },
    listaCotejo: { id: 0, items: [] },
    escalaValoracion: {
      id: 0,
      criteriosGenerales: "",
      tipo: "Cualitativa",
      interpretacionRangos: "",
      niveles: [],
    },
    instrumentoPersonalizado: {
      descripcion: "",
      tipoEvidenciaEsperada: "",
      metodoValoracion: "",
      requiereArchivo: false,
      requiereRespuestaTexto: false,
    },
    adaptaciones: [],
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
        grado_grupo: gradoGrupoMock(row.grado, row.grupo),
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
    const dia = url.searchParams.get("dia")

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

    const porDia = filtrarPorDiaActivo(
      filtered,
      (row) => ({ inicio: row.fechaInicio, cierre: row.fechaCierre }),
      dia,
    )

    const page = paginate(porDia.rows, url)
    // Día vacío: una sola fila centinela con todo en `null` salvo la
    // navegación — mismo contrato que el real (ver `use-actividades-mias-
    // query.ts`, que la reconoce por `pk_tactividad === null`).
    if (dia && page.rows.length === 0) {
      return HttpResponse.json({
        rows: [
          {
            pk_tactividad: null,
            titulo: null,
            estado: null,
            fecha_inicio: null,
            fecha_cierre: null,
            asignatura: null,
            grupo: null,
            unidad: null,
            instrumento_evaluacion: null,
            ponderacion: null,
            es_evaluativa: null,
            estudiantes_asignados: null,
            estudiantes_evaluados: null,
            total_count: 0,
            dia: porDia.dia,
            dia_anterior: porDia.diaAnterior,
            dia_siguiente: porDia.diaSiguiente,
          },
        ],
      })
    }

    const rows = page.rows.map((row) => ({
      pk_tactividad: row.id,
      titulo: row.nombre,
      estado: statusToEstadoDerivado(row.status),
      fecha_inicio: row.fechaInicio,
      fecha_cierre: row.fechaCierre,
      asignatura: row.asignatura,
      grado: row.grado,
      grado_codigo: null,
      grado_grupo: gradoGrupoMock(row.grado, row.grupo),
      grupo: row.grupo,
      unidad: row.unidad.nombre || null,
      instrumento_evaluacion: row.instrumento,
      ponderacion: row.ponderacion,
      es_evaluativa: row.esEvaluativa ? "S" : "N",
      estudiantes_asignados: row.totalEstudiantes,
      estudiantes_evaluados: row.evaluados,
      total_count: page.totalCount,
      dia: porDia.dia,
      dia_anterior: porDia.diaAnterior,
      dia_siguiente: porDia.diaSiguiente,
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

  // Agrega UNA evidencia a una actividad ya creada — mismo camino real que
  // documenta la colección Postman `planeador-flujo-unidad-actividad`
  // (nota del paso 7) para cuando no se marcó al crear. No hay endpoint
  // real confirmado para quitar una ya relacionada, así que el mock
  // tampoco lo modela (ver `Actividad.evidenciasIds`).
  http.post(ACTIVIDAD_EVIDENCIAS_URL, async ({ params, request }) => {
    await delay(200)
    const id = Number(params.id)
    const index = planeadorDb.findIndex((row) => row.id === id)
    if (index === -1) {
      return HttpResponse.json({ message: "Actividad no encontrada." }, { status: 404 })
    }
    const body = (await request.json()) as { FK_TLV_EVIDENCIA: number }
    const actual = planeadorDb[index]!
    if (!actual.evidenciasIds.includes(body.FK_TLV_EVIDENCIA)) {
      actual.evidenciasIds = [...actual.evidenciasIds, body.FK_TLV_EVIDENCIA]
    }
    return HttpResponse.json({ status: "ok" })
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
    const url = new URL(request.url)
    const dia = url.searchParams.get("dia")

    // La unidad no tiene fechas propias: se derivan del min/max de sus
    // actividades vinculadas, igual que el backend real (ver el comentario
    // de `Ventana` arriba).
    const ventanaDeUnidad = (unidad: UnidadTematica): Ventana | null => {
      const actividades = unidad.actividades
        .map((a) => planeadorDb.find((p) => p.id === a.actividadId))
        .filter((a): a is Actividad => a != null)
      if (actividades.length === 0) return null
      return {
        inicio: actividades.reduce((min, a) => (a.fechaInicio < min ? a.fechaInicio : min), actividades[0]!.fechaInicio),
        cierre: actividades.reduce((max, a) => (a.fechaCierre > max ? a.fechaCierre : max), actividades[0]!.fechaCierre),
      }
    }

    const porDia = filtrarPorDiaActivo(unidadesTematicasDb, ventanaDeUnidad, dia)
    const page = paginate(porDia.rows, url)

    // Día vacío: misma fila centinela que `/actividades/mias` (ver
    // `use-unidades-query.ts`, que la reconoce por `pk_tunidad === null`).
    if (dia && page.rows.length === 0) {
      return HttpResponse.json({
        rows: [
          {
            pk_tunidad: null,
            total_count: 0,
            dia: porDia.dia,
            dia_anterior: porDia.diaAnterior,
            dia_siguiente: porDia.diaSiguiente,
          },
        ],
      })
    }

    return HttpResponse.json({
      rows: page.rows.map((row) => ({
        ...row,
        gradoId: gradoIdMock(row.grado),
        asignaturaId: asignaturaIdMock(row.asignatura),
        dia: porDia.dia,
        dia_anterior: porDia.diaAnterior,
        dia_siguiente: porDia.diaSiguiente,
      })),
      pageCount: page.pageCount,
      totalCount: page.totalCount,
    })
  }),

  // Rótulo(s) dinámico(s) de la pestaña "Unidad temática" — una fila por
  // referente/nivel educativo presente en `unidadesTematicasDb`
  // (`enfoquePedagogico` hace de proxy del referente en el mock, que no
  // modela uno aparte): "Evaluativo" -> "Unidad temática" (Primaria/
  // Bachillerato), "Formativo" -> "Proyecto pedagógico" (Preescolar). Con
  // un solo enfoque presente entre las unidades del docente, llega una
  // sola fila — el front cae al comportamiento de una sola pestaña sin
  // filtrar (ver `planeador-tabs.tsx`).
  http.get(UNIDAD_TABS_URL, async () => {
    await delay(120)
    const porEnfoque = new Map<string, { grados: Set<number>; asignaturas: Set<number> }>()
    for (const unidad of unidadesTematicasDb) {
      const instrumento = unidad.enfoquePedagogico === "Formativo" ? "Proyecto pedagógico" : "Unidad temática"
      const entry = porEnfoque.get(instrumento) ?? { grados: new Set(), asignaturas: new Set() }
      entry.grados.add(gradoIdMock(unidad.grado))
      entry.asignaturas.add(asignaturaIdMock(unidad.asignatura))
      porEnfoque.set(instrumento, entry)
    }
    const rows = Array.from(porEnfoque.entries()).map(([instrumento, { grados, asignaturas }]) => ({
      instrumento,
      instrumento_info_adicional: null,
      grados: Array.from(grados),
      asignaturas: Array.from(asignaturas),
    }))
    return HttpResponse.json({ rows })
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
    return HttpResponse.json({
      rows: [{ ...found, gradoId: gradoIdMock(found.grado), asignaturaId: asignaturaIdMock(found.asignatura) }],
    })
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

  // Referente curricular derivable de GRADO + ASIGNATURA directo, sin
  // unidad todavía (colección Postman 3.0) — usado por `EvaluacionSection`
  // para "¿es formativa?" en una actividad huérfana. El mock no modela un
  // catálogo de referentes aparte: reusa cualquier unidad existente que
  // matchee grado+asignatura (mismo esquema de ids sintéticos por hash que
  // `/docentes/grado-asignatura`) para heredar su enfoque y enunciados; sin
  // ninguna que matchee, cae al default histórico "Evaluativo".
  http.get(REFERENTE_CURRICULAR_URL, async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const gradoIdParam = url.searchParams.get("grado")
    if (!gradoIdParam) {
      return HttpResponse.json({ message: "grado es obligatorio" }, { status: 400 })
    }
    const gradoId = Number(gradoIdParam)
    const asignaturaIdParam = url.searchParams.get("asignatura")
    const asignaturaId = asignaturaIdParam ? Number(asignaturaIdParam) : null

    const unidad = unidadesTematicasDb.find((u) => {
      if (hashString(`grado-${u.grado}`) % 1000000 !== gradoId) return false
      if (asignaturaId == null) return true
      return hashString(`asignatura-${u.asignatura}`) % 1000000 === asignaturaId
    })

    const { nivel1, nivel2 } = nivelEtiquetasMock(unidad?.enfoquePedagogico ?? "Evaluativo")
    return HttpResponse.json({
      rows: [
        {
          especificidad: 0,
          enfoque_valor: unidad?.enfoquePedagogico === "Formativo" ? "FORMATIVO" : "EVALUATIVO",
          tipo_evaluacion_valor: "CUANTITATIVA_CUALITATIVA",
          nivel_1_etiqueta: nivel1,
          nivel_2_etiqueta: nivel2,
          enunciados: (unidad?.enunciadosDba ?? []).map((enunciado) => ({
            pk: enunciado.id,
            texto: enunciado.text,
            evidencias: evidenciasMock(enunciado.id, enunciado.text),
          })),
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
  // la actividad no existe, igual que el GET de detalle.
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

  // Exportar (formato de intercambio JSON, no PDF/Excel — ver
  // `use-exportar-actividades-json.ts`). Registrado ANTES que
  // `ACTIVIDAD_DETAIL_URL`/`ACTIVIDAD_DELETE_URL` no hace falta acá: esos
  // matchean por MÉTODO (GET/PATCH) y este es POST, así que no compiten por
  // la misma ruta como sí pasaría entre dos GET.
  http.post(ACTIVIDAD_EXPORTAR_JSON_URL, async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as {
      IDS?: number[]
      PK_TUNIDAD?: number
      FK_TASIGNATURA?: number
      FK_TGRUPO?: number
    }

    if (!body.IDS?.length && body.PK_TUNIDAD == null && !body.FK_TASIGNATURA && !body.FK_TGRUPO) {
      return HttpResponse.json(
        { message: "Hay que indicar al menos un filtro para exportar" },
        { status: 400 },
      )
    }

    let rows = planeadorDb
    if (body.IDS?.length) {
      const ids = new Set(body.IDS)
      const found = rows.filter((actividad) => ids.has(actividad.id))
      const missing = body.IDS.filter((id) => !found.some((actividad) => actividad.id === id))
      if (missing.length > 0) {
        return HttpResponse.json(
          { message: `No se encontraron las actividades ${missing.join(", ")}` },
          { status: 400 },
        )
      }
      rows = found
    }
    // El mock no modela `FK_TASIGNATURA`/`FK_TGRUPO` como ids reales sobre
    // `planeadorDb` (ahí esos campos son texto plano) — solo `PK_TUNIDAD` sí
    // tiene un id (`unidad.id`) y por eso es el único filtro sin `IDS` que
    // acota en mock.
    if (body.PK_TUNIDAD != null) {
      rows = rows.filter((actividad) => actividad.unidad.id === body.PK_TUNIDAD)
    }

    return HttpResponse.json(rows.map(toActividadExportada))
  }),

  // Importar (dos pasos: `SOLO_VALIDAR` decide si escribe). El mock no
  // resuelve destino contra catálogos reales —solo comprueba que haya de
  // dónde sacarlo (`_identificadores` o algún `FK_*` del cuerpo) y que
  // venga un `tipo`—, alcanza para probar el flujo de validar → aplicar.
  http.post(ACTIVIDAD_IMPORTAR_JSON_URL, async ({ request }) => {
    await delay(500)
    const body = (await request.json()) as {
      ACTIVIDADES: Record<string, unknown>[]
      SOLO_VALIDAR?: boolean
      FK_TASIGNATURA?: number
      FK_TGRUPO?: number
      FK_TGRADO?: number
    }
    const soloValidar = body.SOLO_VALIDAR !== false

    const filas: FilaInformeImportacion[] = body.ACTIVIDADES.map((raw, indice) => {
      const nombre = String(raw.nombre ?? `Actividad ${indice + 1}`)
      const identificadores = raw._identificadores as
        | { pkTunidad?: number; fkTasignatura?: number; fkTgrupo?: number; fkTgrado?: number }
        | undefined
      const tieneDestino =
        identificadores?.fkTasignatura != null ||
        identificadores?.fkTgrupo != null ||
        body.FK_TASIGNATURA != null ||
        body.FK_TGRUPO != null

      if (!tieneDestino) {
        return {
          estado: "error",
          indice,
          nombre,
          errores: [
            "destino: no se pudo resolver la asignatura ni el grupo (ni _identificadores en la actividad ni FK_* en el cuerpo)",
          ],
        }
      }
      if (!raw.tipo) {
        return { estado: "error", indice, nombre, errores: ['tipo: no viene en la actividad'] }
      }

      return {
        estado: "ok",
        indice,
        nombre,
        resuelto: {
          fkTasignatura: identificadores?.fkTasignatura ?? body.FK_TASIGNATURA,
          fkTgrupo: identificadores?.fkTgrupo ?? body.FK_TGRUPO,
          fkTgrado: identificadores?.fkTgrado ?? body.FK_TGRADO,
          pkTunidad: identificadores?.pkTunidad,
        },
      }
    })

    const validas = filas.filter((fila) => fila.estado === "ok").length
    const conError = filas.length - validas

    if (soloValidar) {
      return HttpResponse.json({
        modo: "validacion",
        total: filas.length,
        validas,
        conError,
        aplicadas: 0,
        mensaje:
          conError === 0
            ? "Todas las actividades son importables"
            : `${conError} de ${filas.length} actividades tienen problemas`,
        filas,
      })
    }

    if (conError > 0) {
      return HttpResponse.json({
        modo: "aplicacion",
        total: filas.length,
        validas,
        conError,
        aplicadas: 0,
        mensaje: `No se importó nada: ${conError} de ${filas.length} actividades tienen problemas. La importación es todo o nada`,
        filas,
      })
    }

    const filasAplicadas: FilaInformeImportacion[] = body.ACTIVIDADES.map((raw, indice) => {
      const id = nextId(planeadorDb.map((actividad) => actividad.id))
      const creada = actividadFromImportRow(raw, id)
      addActividad(creada)
      return { estado: "ok", indice, nombre: creada.nombre, pkTactividad: id }
    })

    return HttpResponse.json({
      modo: "aplicacion",
      total: filasAplicadas.length,
      validas: filasAplicadas.length,
      conError: 0,
      aplicadas: filasAplicadas.length,
      mensaje: `${filasAplicadas.length} actividades importadas`,
      filas: filasAplicadas,
    })
  }),
]
