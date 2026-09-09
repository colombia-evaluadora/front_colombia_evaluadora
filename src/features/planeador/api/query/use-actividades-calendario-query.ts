import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { estadoDerivadoToStatus } from "@/features/planeador/lib/estado-derivado"
import type { ActividadStatus } from "@/features/planeador/api/types/actividad"

/**
 * `GET /planeador/actividades/calendario` (V251, ver colección Postman
 * `planeador-pantalla-principal`) — reemplaza el hack de traer TODAS las
 * actividades con `size=500` y filtrar el mes en el cliente
 * (`use-actividades-query.ts`): este endpoint no pagina, filtra por
 * SOLAPAMIENTO entre `[fecha_inicio, fecha_cierre]` de la actividad y el
 * rango `[fecha_desde, fecha_hasta]` pedido (una actividad que empezó en el
 * mes anterior pero sigue abierta SÍ aparece), y ya trae `fecha` como día de
 * anclaje resuelto para agrupar la grilla. `fecha_desde`/`fecha_hasta` son
 * obligatorios.
 *
 * OJO con los nombres de query param: el binder del query-service solo hace
 * `toUpperCase()`, no convierte camelCase a snake_case — `fechaDesde` liga a
 * `QUERY.FECHADESDE` (no declarado) y el filtro se ignora en silencio. Acá
 * van en snake_case exacto (`fecha_desde`/`fecha_hasta`).
 */
interface ActividadCalendarioRow {
  fecha: string
  fecha_inicio: string
  fecha_cierre: string
  pk_tactividad: number
  titulo: string
  grupo: string | null
  asignatura: string | null
  area: string | null
  estado: string
  /** Confirmado real (colección Postman `planeador-delta-cambios`, punto
   *  3.2) — reemplaza al `pk_tactividad` que la celda del calendario
   *  mostraba antes por error donde debía ir el grado+grupo (`"34 | MATEMA…"`
   *  en vez de `"601 | MATEMA…"`). Ver el comentario de `Actividad.gradoGrupo`. */
  grado_grupo: string | null
}

export interface ActividadCalendario {
  fecha: string
  fechaInicio: string
  fechaCierre: string
  id: number
  titulo: string
  /** `asignatura` para actividades normales; `area` para las que solo
   *  tienen área general (ver la fila cruda) — nunca los dos a la vez. */
  label: string
  status: ActividadStatus
  /** Ver `ActividadCalendarioRow.grado_grupo` — `undefined` solo si el
   *  backend real todavía no lo manda para esta fila. */
  gradoGrupo?: string
}

// Vienen como datetime ISO completo ("2026-09-01T00:00:00.000Z"),
// confirmado contra el backend real (ver `use-actividades-mias-query.ts`) —
// no como `yyyy-MM-dd` plano, aunque así lo mostraba, de forma solo
// ilustrativa, el ejemplo de la colección Postman.
function toDateOnly(value: string): string {
  return value.slice(0, 10)
}

function toActividadCalendario(row: ActividadCalendarioRow): ActividadCalendario {
  return {
    fecha: toDateOnly(row.fecha),
    fechaInicio: toDateOnly(row.fecha_inicio),
    fechaCierre: toDateOnly(row.fecha_cierre),
    id: row.pk_tactividad,
    titulo: row.titulo,
    label: row.asignatura ?? row.area ?? "",
    status: estadoDerivadoToStatus(row.estado),
    gradoGrupo: row.grado_grupo ?? undefined,
  }
}

export interface UseActividadesCalendarioParams {
  fechaDesde: string
  fechaHasta: string
  asignatura?: number
  grupo?: number
  unidad?: number
}

async function fetchActividadesCalendario(
  params: UseActividadesCalendarioParams,
): Promise<ActividadCalendario[]> {
  const query = new URLSearchParams({
    fecha_desde: params.fechaDesde,
    fecha_hasta: params.fechaHasta,
  })
  if (params.asignatura != null) query.set("asignatura", String(params.asignatura))
  if (params.grupo != null) query.set("grupo", String(params.grupo))
  if (params.unidad != null) query.set("unidad", String(params.unidad))

  const rows = await evalCol.getRows<ActividadCalendarioRow>(
    `/planeador/actividades/calendario?${query}`,
  )
  return rows.map(toActividadCalendario)
}

export const actividadesCalendarioQueryKey = (params: UseActividadesCalendarioParams) =>
  ["planeador", "actividades-calendario", params] as const

export function useActividadesCalendarioQuery(params: UseActividadesCalendarioParams) {
  return useQuery({
    queryKey: actividadesCalendarioQueryKey(params),
    queryFn: () => fetchActividadesCalendario(params),
    // SIN `placeholderData`, a propósito: la grilla mensual mapea estas
    // actividades por día-DE-MES (`date.getDate()`, ver
    // `planeador-page.tsx`), sin el mes en la clave. Si al cambiar de mes se
    // siguiera mostrando la respuesta del mes ANTERIOR mientras el fetch
    // nuevo está en vuelo, esas actividades aparecerían bajo los números de
    // día del mes NUEVO como si fueran de ese mes — el bug reportado de
    // "actividades que no son del mes en donde estoy". Mejor un parpadeo a
    // vacío que un mes mostrando datos de otro.
    staleTime: 1000 * 30,
  })
}
