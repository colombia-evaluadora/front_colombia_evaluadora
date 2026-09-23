import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"

import { estadoDerivadoToStatus } from "@/features/planeador/lib/estado-derivado"
import type { MetodoCalculo, UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

const UNIDAD_LIST_URL = "/planeador/unidades"

// Mismo criterio que `use-actividades-query.ts`: el contrato real exige
// `size`/`offset` explícitos en la query string de los listados paginados.
const PAGE_SIZE = 500

/**
 * Fila real de `fn_unidad_listar`/`fn_unidad_buscar_por_pk` (colección
 * Postman `planeador-unidad`) — confirmada contra una respuesta real de
 * `GET /planeador/unidades`, que ya trae `area`, `descripcion`,
 * `fecha_inicio`/`fecha_fin` y `total_actividades` en el LISTADO (no solo
 * en el detalle, como se creía antes). `toUnidadTematica` igual tolera que
 * cualquiera venga ausente, por si el detalle no las repite todas.
 */
interface UnidadRealRow {
  pk_tunidad: number
  nombre: string
  asignatura: string
  /** Id real de la asignatura — necesario para preseleccionar el `<Select>`
   *  de "Asignatura" en el form de edición contra el catálogo del docente
   *  (`fk_tasignatura`, ver `use-docente-grado-asignatura-query.ts`). */
  fk_tasignatura?: number
  /** Área curricular de la asignatura (`fk_tarea`). */
  area?: string
  grado: string
  /** Id real del grado — mismo criterio que `fk_tasignatura`, para el
   *  `<Select>` de "Grado" (`fk_tgrado`). */
  fk_tgrado?: number
  descripcion?: string
  calculo_definitiva?: string
  /** sso V488 — instrumento de evaluación FIJADO en la unidad (catálogo
   *  `INSTRUMENTO_EVALUACION`, mismo que usa cada actividad). `undefined`/
   *  `null` en unidades que no lo fijaron (todas las anteriores a V488). */
  fk_tlv_instrumento_evaluacion?: number | null
  instrumento_evaluacion?: string | null
  objetivos?: { pk: number; orden: number; descripcion: string }[]
  contenidos?: { pk: number; orden: number; descripcion: string }[]
  active?: boolean
  /** Estado derivado de la unidad (`fn_unidad_listar`/`_buscar_por_pk`) —
   *  los MISMOS cuatro valores que ya deriva `/actividades` (colección
   *  Postman `planeador-guia-completa`, 2.1): una unidad hereda el peor
   *  estado entre sus actividades. `estadoDerivadoToStatus` ya sabe
   *  traducirlos porque es el mismo union que `ActividadStatus`. */
  estado?: string
  /** Ver el comentario de `UnidadTematica.referenteVigente` — mismo campo
   *  en listado y detalle (colección Postman `planeador-delta-cambios`,
   *  punto 6). */
  referente_vigente?: boolean
  total_actividades?: number
  /** ISO con hora (`"2026-09-01T00:00:00.000Z"`). `formatDate`/
   *  `parseLocalDate` ya toleran el sufijo de hora (`.slice(0, 10)`), así
   *  que se guardan tal cual. */
  fecha_inicio?: string
  fecha_fin?: string
  // Presentes (no NULL) solo cuando se manda `?dia=` — sin él, "nada
  // cambia del comportamiento anterior" (colección Postman 2.1).
  dia?: string | null
  dia_anterior?: string | null
  dia_siguiente?: string | null
}

/** `"Ponderar Actividades o Descriptores"` → `"Ponderado"`, etc. — el
 *  detalle real resuelve el nombre del catálogo `CALCULO_DEFINITIVA`, no
 *  el código; se empareja por substring en vez de una tabla exacta porque
 *  no tenemos confirmado el texto completo de las otras dos opciones. */
function metodoCalculoFromLabel(label: string | undefined): MetodoCalculo {
  const lower = label?.toLowerCase() ?? ""
  if (lower.includes("promediar")) return "Promedio simple"
  if (lower.includes("suma")) return "Suma de puntos"
  return "Ponderado"
}

function toUnidadTematica(row: UnidadRealRow): UnidadTematica {
  return {
    id: row.pk_tunidad,
    nombre: row.nombre,
    area: row.area ?? "",
    // El backend real no guarda un "enfoque pedagógico" propio por unidad:
    // se deriva del referente curricular de grado/asignatura, igual que ya
    // hace `useEnfoquePedagogicoDerivado` en el form de edición. Acá queda
    // en un default — los lugares que lo leen directo de este objeto
    // (`getVisibleTabs`, `EvaluacionSection`) ven "Evaluativo" hasta que se
    // abra el form de edición, que lo recalcula de una.
    enfoquePedagogico: "Evaluativo",
    // `estado` ya trae los 4 valores derivados reales (VENCIDA hereda de
    // cualquier actividad vencida, etc. — ver el comentario de
    // `UnidadRealRow.estado`); `active` queda solo de respaldo por si algún
    // endpoint viejo todavía no lo manda.
    status: row.estado ? estadoDerivadoToStatus(row.estado) : row.active === false ? "cancelled" : "in-progress",
    fechaInicio: row.fecha_inicio ?? "",
    fechaFin: row.fecha_fin ?? "",
    descripcion: row.descripcion ?? "",
    objetivos: (row.objetivos ?? []).map((o) => o.descripcion),
    contenidos: (row.contenidos ?? []).map((c) => c.descripcion),
    metodoCalculo: metodoCalculoFromLabel(row.calculo_definitiva),
    grado: row.grado,
    asignatura: row.asignatura,
    gradoId: row.fk_tgrado,
    asignaturaId: row.fk_tasignatura,
    // Enunciados DBA y criterios viven en endpoints separados del backend
    // real (`/unidades/:id/enunciados`, `/unidades/:id/criterios`) —
    // quedan vacíos acá; las pantallas que los muestran los piden aparte
    // (ver `use-unidad-actividades-query.ts` para el caso ya resuelto de
    // actividades vinculadas). El conteo de la card del rail sí viene
    // resuelto en este mismo listado (`total_actividades`, ver abajo).
    enunciadosDba: [],
    criterios: [],
    actividades: [],
    totalActividades: row.total_actividades,
    referenteVigente: row.referente_vigente,
    instrumento: row.instrumento_evaluacion ?? undefined,
    instrumentoId: row.fk_tlv_instrumento_evaluacion ?? undefined,
  }
}

export interface UseUnidadesParams {
  /** `yyyy-MM-dd` — paginado por día activo (colección Postman 2.1): solo
   *  unidades con alguna actividad vigente ese día. Sin esto, el listado no
   *  cambia (comportamiento previo). */
  dia?: string
}

export interface UnidadesResult {
  rows: UnidadTematica[]
  /** `dia_anterior`/`dia_siguiente` que trae la respuesta cuando se pide
   *  `?dia=` — el día OCUPADO más cercano a cada lado (saltando vacíos),
   *  `null` cuando no hay más por ese lado. `undefined` si no se pidió
   *  `?dia=`. */
  diaAnterior?: string | null
  diaSiguiente?: string | null
}

/** Fila-centinela de un día vacío (2.1): `pk_tunidad` viene NULL junto con
 *  todas las demás columnas de negocio, pero trae `dia_anterior`/
 *  `dia_siguiente` para no dejar al usuario sin cómo salir del día vacío. */
interface UnidadSentinelRow {
  pk_tunidad: null
  total_count: number
  dia_anterior?: string | null
  dia_siguiente?: string | null
}

function isSentinel(row: unknown): row is UnidadSentinelRow {
  return (row as { pk_tunidad?: unknown } | null)?.pk_tunidad === null
}

export const unidadesQueryKey = (params: UseUnidadesParams = {}) =>
  ["planeador", "unidades", params] as const

async function fetchUnidades(params: UseUnidadesParams): Promise<UnidadesResult> {
  const query = new URLSearchParams({ size: String(PAGE_SIZE), offset: "0" })
  if (params.dia) query.set("dia", params.dia)

  // `evalCol.getRows` desenvuelve el sobre `{rows: [...]}` del gateway —
  // eso es idéntico en mock y real (el motor real SIEMPRE envuelve así).
  // Lo que cambia es la forma de cada fila adentro: el mock ya entrega
  // `UnidadTematica` completa; el real entrega `UnidadRealRow` y hay que
  // traducirla. La fila-centinela de día vacío usa la misma forma
  // (`pk_tunidad: null`) en los dos modos.
  const rows = await evalCol.getRows<UnidadTematica | UnidadRealRow | UnidadSentinelRow>(
    `${UNIDAD_LIST_URL}?${query}`,
  )
  const first = rows[0]
  if (params.dia && rows.length === 1 && isSentinel(first)) {
    return { rows: [], diaAnterior: first.dia_anterior ?? null, diaSiguiente: first.dia_siguiente ?? null }
  }

  const mapped = env.ENABLE_API_MOCKING
    ? (rows as UnidadTematica[])
    : (rows as UnidadRealRow[]).map(toUnidadTematica)
  const diaRow = first as UnidadRealRow | undefined
  return {
    rows: mapped,
    diaAnterior: params.dia ? (diaRow?.dia_anterior ?? null) : undefined,
    diaSiguiente: params.dia ? (diaRow?.dia_siguiente ?? null) : undefined,
  }
}

export function useUnidadesQuery(params: UseUnidadesParams = {}) {
  return useQuery({
    queryKey: unidadesQueryKey(params),
    queryFn: () => fetchUnidades(params),
    // Mantiene la lista anterior mientras se revalida — evita el flash a
    // "Sin unidades" al volver a la pestaña.
    placeholderData: (previous) => previous,
    staleTime: 1000 * 30,
  })
}

function unidadDetalleUrl(id: number): string {
  return `/planeador/unidades/${id}`
}

export const unidadDetalleQueryKey = (id: number) =>
  ["planeador", "unidad", id] as const

/**
 * Detalle de una unidad. El mock responde `{rows: [unidad]}` para mantener
 * paridad con el resto del microservicio; si no existe se lanza para que el
 * panel muestre su estado de error.
 */
async function fetchUnidadDetalle(id: number): Promise<UnidadTematica> {
  const rows = await evalCol.getRows<UnidadTematica | UnidadRealRow>(unidadDetalleUrl(id))
  const first = rows[0]
  if (!first) {
    throw new Error(`No se encontró la unidad ${id}.`)
  }
  return env.ENABLE_API_MOCKING ? (first as UnidadTematica) : toUnidadTematica(first as UnidadRealRow)
}

export function useUnidadDetalleQuery(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? unidadDetalleQueryKey(id) : ["planeador", "unidad", "none"],
    queryFn: () => fetchUnidadDetalle(id!),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
  })
}
