import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/actividades/tabs` — las pestañas de "Actividades", una por
 * Rótulo de Ejecución ("Actividad" / "Experiencia de aprendizaje", …).
 *
 * A diferencia de `/planeador/unidades/tabs` (que agrupa por referente a
 * nivel GRADO), acá el agrupamiento es por el rótulo ya resuelto a nivel
 * GRADO+ASIGNATURA: dos asignaturas de un mismo grado pueden caer en
 * pestañas distintas. Por eso `grado_asignatura_pares` — y no `grados`
 * sueltos — es la fuente correcta para filtrar/acotar: un grado puede
 * aparecer en dos pestañas si sus asignaturas resuelven a rótulos distintos.
 */
interface ActividadTabOptionRow {
  id?: number
  grado_id?: number
  asignatura_id?: number
  pk?: number
  nombre?: string
}
interface ActividadTabPairRow {
  grado: number
  asignatura: number | null
}
interface ActividadTabRow {
  rotulo_ejecucion: string
  pk_referente_curricular?: number | null
  grados?: (number | ActividadTabOptionRow)[]
  asignaturas?: (number | ActividadTabOptionRow)[]
  grado_asignatura_pares?: ActividadTabPairRow[]
}

export interface ActividadTabOption {
  id: number
  nombre: string
}

export interface ActividadTabPair {
  gradoId: number
  asignaturaId: number | null
}

export interface ActividadTab {
  /** Singular ("Actividad", "Experiencia de aprendizaje") — la clave de
   *  identidad (lo que viaja en `?rotulo=`) Y el texto que se pinta en la
   *  pestaña, igual que "Unidad temática"/"Proyecto pedagógico" (un nombre
   *  de categoría, no una lista pluralizada). Nunca se pluraliza: el texto
   *  no es un dato controlado, y concatenar "s" a mano (o confiar en una
   *  forma plural configurada aparte) rompe con cualquier palabra no
   *  prevista (ver el bug de "Actividads"). */
  rotulo: string
  referenteId: number | null
  grados: ActividadTabOption[]
  asignaturas: ActividadTabOption[]
  gradoIds: number[]
  /** Los pares (grado, asignatura) reales de esta pestaña — filtrar por
   *  `gradoIds` solo puede filtrar de más: un grado puede caer en dos
   *  pestañas si sus asignaturas resuelven a rótulos distintos.
   *  `asignaturaId: null` = cualquier asignatura de ese grado (rama
   *  territorial, sin asignatura puntual). */
  pares: ActividadTabPair[]
}

function toOptions(items: (number | ActividadTabOptionRow)[] | undefined): ActividadTabOption[] {
  return (items ?? [])
    .map((item) => {
      if (typeof item === "number") return { id: item, nombre: String(item) }
      const id = item.id ?? item.grado_id ?? item.asignatura_id ?? item.pk
      const nombre = item.nombre
      return id != null && nombre != null ? { id, nombre } : undefined
    })
    .filter((option): option is ActividadTabOption => option !== undefined)
}

function toActividadTab(row: ActividadTabRow): ActividadTab {
  const grados = toOptions(row.grados)
  return {
    rotulo: row.rotulo_ejecucion,
    referenteId: row.pk_referente_curricular ?? null,
    grados,
    asignaturas: toOptions(row.asignaturas),
    gradoIds: grados.map((g) => g.id),
    pares: (row.grado_asignatura_pares ?? []).map((p) => ({
      gradoId: p.grado,
      asignaturaId: p.asignatura,
    })),
  }
}

export const actividadesTabsQueryKey = () => ["planeador", "actividades-tabs"] as const

async function fetchActividadesTabs(): Promise<ActividadTab[]> {
  const rows = await evalCol.getRows<ActividadTabRow>("/planeador/actividades/tabs")
  return rows.map(toActividadTab)
}

/** `staleTime` largo: mismo criterio que `useUnidadesTabsQuery` — lo que
 *  dicta/administra un docente no cambia dentro de una sesión. */
export function useActividadesTabsQuery() {
  return useQuery({
    queryKey: actividadesTabsQueryKey(),
    queryFn: fetchActividadesTabs,
    staleTime: 1000 * 60 * 5,
  })
}

/** Serializa los pares de una pestaña para `?grado_asignatura_pares=`
 *  (`use-actividades-mias-query.ts`) — `asignaturaId: null` se preserva tal
 *  cual: matchea CUALQUIER asignatura de ese grado en el backend. */
export function paresToQueryParam(pares: ActividadTabPair[]): string {
  return JSON.stringify(pares.map((p) => ({ grado: p.gradoId, asignatura: p.asignaturaId })))
}
