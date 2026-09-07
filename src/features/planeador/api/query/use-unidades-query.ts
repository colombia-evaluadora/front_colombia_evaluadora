import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"

import type { MetodoCalculo, UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

const UNIDAD_LIST_URL = "/planeador/unidades"

// Mismo criterio que `use-actividades-query.ts`: el contrato real exige
// `size`/`offset` explícitos en la query string de los listados paginados.
const PAGE_SIZE = 500

/**
 * Fila real de `fn_unidad_listar`/`fn_unidad_buscar_por_pk` (colección
 * Postman `planeador-unidad`). El listado solo trae un subconjunto de estos
 * campos (`pk_tunidad`, `nombre`, `asignatura`, `grado`,
 * `total_actividades`); el detalle agrega `calculo_definitiva`,
 * `objetivos`/`contenidos` y `active`. `toUnidadTematica` tolera que
 * cualquiera de los campos "de detalle" venga ausente.
 *
 * Campos que la colección documenta pero NO muestra en su ejemplo de
 * respuesta (fechas derivadas MIN/MAX de actividades, `descripcion`) no
 * están acá — hace falta confirmar sus nombres de columna contra una
 * respuesta real antes de mapearlos con confianza.
 */
interface UnidadRealRow {
  pk_tunidad: number
  nombre: string
  asignatura: string
  grado: string
  calculo_definitiva?: string
  objetivos?: { pk: number; orden: number; descripcion: string }[]
  contenidos?: { pk: number; orden: number; descripcion: string }[]
  active?: boolean
  total_actividades?: number
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
    // `área` no existe como columna en el backend real —era un campo propio
    // del mock— así que queda vacía hasta que el negocio defina qué mostrar
    // ahí (o se saque del todo de la UI).
    area: "",
    // El backend real no guarda un "enfoque pedagógico" propio por unidad:
    // se deriva del referente curricular de grado/asignatura, igual que ya
    // hace `useEnfoquePedagogicoDerivado` en el form de edición. Acá queda
    // en un default — los lugares que lo leen directo de este objeto
    // (`getVisibleTabs`, `EvaluacionSection`) ven "Evaluativo" hasta que se
    // abra el form de edición, que lo recalcula de una.
    enfoquePedagogico: "Evaluativo",
    // Tampoco hay un status de 4 estados real para unidad, solo `active` —
    // se aproxima a dos de los cuatro que ya usa la UI.
    status: row.active === false ? "cancelled" : "in-progress",
    // La colección documenta que el detalle trae fechas derivadas (MIN/MAX
    // de actividades activas), pero su ejemplo no muestra los nombres de
    // columna — quedan vacías hasta confirmarlos contra una respuesta real.
    fechaInicio: "",
    fechaFin: "",
    descripcion: "",
    objetivos: (row.objetivos ?? []).map((o) => o.descripcion),
    contenidos: (row.contenidos ?? []).map((c) => c.descripcion),
    metodoCalculo: metodoCalculoFromLabel(row.calculo_definitiva),
    grado: row.grado,
    asignatura: row.asignatura,
    // Enunciados DBA, criterios y actividades vinculadas viven en endpoints
    // separados del backend real (`/unidades/:id/criterios`,
    // `/unidades/:id/actividades`) — traerlos de una implica un fetch
    // compuesto que todavía no está armado (ver nota en el mensaje al
    // usuario). Quedan vacíos hasta esa integración; por eso
    // `UnidadCard` muestra "0 actividades" contra el backend real aunque
    // `total_actividades` diga otra cosa.
    enunciadosDba: [],
    criterios: [],
    actividades: [],
  }
}

export const unidadesQueryKey = () => ["planeador", "unidades"] as const

async function fetchUnidades(): Promise<UnidadTematica[]> {
  // `evalCol.getRows` desenvuelve el sobre `{rows: [...]}` del gateway —
  // eso es idéntico en mock y real (el motor real SIEMPRE envuelve así).
  // Lo que cambia es la forma de cada fila adentro: el mock ya entrega
  // `UnidadTematica` completa; el real entrega `UnidadRealRow` y hay que
  // traducirla.
  const rows = await evalCol.getRows<UnidadTematica | UnidadRealRow>(
    `${UNIDAD_LIST_URL}?size=${PAGE_SIZE}&offset=0`,
  )
  if (env.ENABLE_API_MOCKING) return rows as UnidadTematica[]
  return (rows as UnidadRealRow[]).map(toUnidadTematica)
}

export function useUnidadesQuery() {
  return useQuery({
    queryKey: unidadesQueryKey(),
    queryFn: fetchUnidades,
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
