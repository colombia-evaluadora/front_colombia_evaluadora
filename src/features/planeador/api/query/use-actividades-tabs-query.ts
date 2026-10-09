import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { usePlaneadorDocenteScope } from "@/features/planeador/hooks/use-planeador-docente-scope"

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

async function fetchActividadesTabs(funcionario?: number): Promise<ActividadTab[]> {
  const query = funcionario != null ? `?funcionario=${funcionario}` : ""
  const rows = await evalCol.getRows<ActividadTabRow>(`/planeador/actividades/tabs${query}`)
  return rows.map(toActividadTab)
}

/** `staleTime` largo: mismo criterio que `useUnidadesTabsQuery` — lo que
 *  dicta/administra un docente no cambia dentro de una sesión.
 *
 *  El docente sale de `usePlaneadorDocenteScope` (`?docente=` en
 *  Actividades/Unidades): así las pestañas —y los rótulos que se resuelven
 *  desde ellas en componentes profundos— son las del docente que se mira. */
export function useActividadesTabsQuery() {
  const { funcionario, consultasHabilitadas } = usePlaneadorDocenteScope()
  return useQuery({
    queryKey: planeadorKeys.actividades.tabs(funcionario),
    queryFn: () => fetchActividadesTabs(funcionario),
    enabled: consultasHabilitadas,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Serializa los pares de una pestaña para `?grado_asignatura_pares=`
 * (`use-actividades-mias-query.ts`) — CSV de `"grado:asignatura"`
 * (`asignaturaId == null` → `"grado:"`, comodín de cualquier asignatura de
 * ese grado), NO JSON: un parámetro de query string de un GET siempre llega
 * como `String` al binder del backend (sso V253/V526/V527) — un valor JSON
 * ahí rompe en runtime ("La consulta está mal definida en el catálogo"),
 * nunca lo deserializa como objeto/arreglo.
 */
export function paresToQueryParam(pares: ActividadTabPair[]): string {
  return pares.map(parToString).join(",")
}

/** Un par como lo espera el back: "grado:asignatura" (asignatura vacía = comodín, V526). */
export function parToString(p: ActividadTabPair): string {
  return `${p.gradoId}:${p.asignaturaId ?? ""}`
}
