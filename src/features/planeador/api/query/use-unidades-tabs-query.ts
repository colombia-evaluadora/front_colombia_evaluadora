import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/unidades/tabs` (confirmado real, colección Postman
 * `planeador-flujo-unidad-actividad`, paso 1) — el rótulo de la pestaña
 * "Unidad temática" NO es fijo: sale del campo `instrumento` del referente
 * curricular de cada nivel educativo que dicta el docente autenticado
 * ("Unidad temática" en Primaria, "Proyecto pedagógico" en Preescolar, …).
 * Un docente con grados de varios niveles recibe UNA fila por referente —
 * son varias pestañas, no una sola fija.
 *
 * Cada fila trae además `grados`/`asignaturas`: lo que cae bajo esa
 * pestaña, para filtrar el listado de unidades sin volver a preguntar. La
 * colección no trae un ejemplo capturado de la forma exacta de esos dos
 * campos (solo la descripción cualitativa) — `toIds` tolera tanto un
 * array de ids planos como de objetos con `id`/`grado_id`/`pk`, para no
 * romper si el shape real termina siendo distinto.
 */
interface UnidadTabRow {
  instrumento: string
  instrumento_info_adicional?: string | null
  grados?: (number | { id?: number; grado_id?: number; pk?: number })[]
  asignaturas?: (number | { id?: number; asignatura_id?: number; pk?: number })[]
}

export interface UnidadTab {
  instrumento: string
  descripcion: string | null
  gradoIds: number[]
  asignaturaIds: number[]
}

function toIds(items: (number | { id?: number; grado_id?: number; asignatura_id?: number; pk?: number })[] | undefined): number[] {
  return (items ?? [])
    .map((item) =>
      typeof item === "number" ? item : (item.id ?? item.grado_id ?? item.asignatura_id ?? item.pk),
    )
    .filter((id): id is number => typeof id === "number")
}

function toUnidadTab(row: UnidadTabRow): UnidadTab {
  return {
    instrumento: row.instrumento,
    descripcion: row.instrumento_info_adicional ?? null,
    gradoIds: toIds(row.grados),
    asignaturaIds: toIds(row.asignaturas),
  }
}

export const unidadesTabsQueryKey = () => ["planeador", "unidades-tabs"] as const

async function fetchUnidadesTabs(): Promise<UnidadTab[]> {
  const rows = await evalCol.getRows<UnidadTabRow>("/planeador/unidades/tabs")
  return rows.map(toUnidadTab)
}

/**
 * `staleTime` largo: la lista de referentes/niveles que dicta un docente no
 * cambia dentro de una sesión — mismo criterio que los catálogos de
 * `TLISTA_VALOR` del módulo.
 */
export function useUnidadesTabsQuery() {
  return useQuery({
    queryKey: unidadesTabsQueryKey(),
    queryFn: fetchUnidadesTabs,
    staleTime: 1000 * 60 * 5,
  })
}
