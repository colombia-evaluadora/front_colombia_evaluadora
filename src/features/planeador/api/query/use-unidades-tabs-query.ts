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
 * pestaña, para filtrar el listado de unidades y, al crear una unidad desde
 * "Agregar {instrumento}", acotar los `<Select>` de Grado/Asignatura sin
 * volver a preguntar — confirmado real contra el servidor de test (V407,
 * 2026-09-17): `[{"pk": <id o null>, "nombre": <nombre o null>}]`. `toOptions`
 * conserva el nombre (antes se descartaba, dejando solo el id) y tolera
 * tanto `pk`/`nombre` como `id`/`grado_id`/`asignatura_id`, por si el shape
 * real varía entre filas. Un `pk` `null` (rama territorial de un
 * rector/coordinador sin asignatura puntual, ver `fn_docente_unidad_tabs_
 * listar` V407) se descarta: no es una opción real para el `<Select>`.
 */
interface UnidadTabOptionRow {
  id?: number
  grado_id?: number
  asignatura_id?: number
  pk?: number
  nombre?: string
}
interface UnidadTabRow {
  instrumento: string
  instrumento_info_adicional?: string | null
  pk_referente_curricular?: number | null
  grados?: (number | UnidadTabOptionRow)[]
  asignaturas?: (number | UnidadTabOptionRow)[]
}

/** Un grado o asignatura reales dentro de una pestaña — `id` es el
 *  `PK_TGRADO`/`PK_TASIGNATURA` real, `nombre` el rótulo para el `<Select>`. */
export interface UnidadTabOption {
  id: number
  nombre: string
}

export interface UnidadTab {
  instrumento: string
  descripcion: string | null
  /** `PK_REFERENTE_CURRICULAR` de esta pestaña — `null` cuando el nivel
   *  todavía no tiene ningún referente cargado (cae al fallback "Unidad
   *  temática", ver `fn_docente_unidad_tabs_listar`). Es la llave EXACTA
   *  para matchear contra el referente ya resuelto de una actividad
   *  puntual (`ReferenteCurricular.id`, `use-referente-curricular-query.ts`)
   *  — matchear por `gradoIds` en cambio puede fallar: esa pestaña agrupa
   *  por GRADO solo, mientras que el referente de una actividad se
   *  resuelve por grado+ASIGNATURA (`fn_refcurr_por_grado_asignatura`),
   *  que puede desempatar a un referente más específico para esa área. */
  referenteId: number | null
  grados: UnidadTabOption[]
  asignaturas: UnidadTabOption[]
  /** Solo los ids de `grados` — lo que ya usan `planeador-unidades-page.tsx`
   *  (filtrar el listado) y `unidad-instrumento-label.ts` (resolver el
   *  rótulo por grado), que no necesitan el nombre. */
  gradoIds: number[]
}

function toOptions(items: (number | UnidadTabOptionRow)[] | undefined): UnidadTabOption[] {
  return (items ?? [])
    .map((item) => {
      if (typeof item === "number") return { id: item, nombre: String(item) }
      const id = item.id ?? item.grado_id ?? item.asignatura_id ?? item.pk
      const nombre = item.nombre
      return id != null && nombre != null ? { id, nombre } : undefined
    })
    .filter((option): option is UnidadTabOption => option !== undefined)
}

function toUnidadTab(row: UnidadTabRow): UnidadTab {
  const grados = toOptions(row.grados)
  return {
    instrumento: row.instrumento,
    descripcion: row.instrumento_info_adicional ?? null,
    referenteId: row.pk_referente_curricular ?? null,
    grados,
    asignaturas: toOptions(row.asignaturas),
    gradoIds: grados.map((g) => g.id),
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

/** Rótulo real del instrumento ("Unidad temática", "Proyecto pedagógico", …)
 *  para un Grado ya elegido — se usa en cualquier lugar que hoy dice
 *  "unidad temática" a secas (`UnidadAsociadaSection`/`UnidadFichaYEvidencias`
 *  en `form-editar-actividad.tsx`, `UnidadFichaYEvidenciasDetalle` en
 *  `detail-sections.tsx`), para que un docente de Preescolar vea "Proyecto
 *  pedagógico" en vez del literal fijo de Primaria. `fallback` es
 *  `UNIDAD_TAB_FALLBACK` (`planeador-tabs.tsx`) — se recibe como parámetro
 *  en vez de importarlo acá para no hacer depender esta capa de query de un
 *  componente de UI. Sin Grado (o sin match en `unidadTabs`) cae a ese
 *  fallback. */
export function resolveInstrumentoLabel(
  gradoId: number | undefined,
  unidadTabs: UnidadTab[] | undefined,
  fallback: string,
): string {
  return (gradoId != null && unidadTabs?.find((t) => t.gradoIds.includes(gradoId))?.instrumento) || fallback
}

/**
 * Mismo rótulo que `resolveInstrumentoLabel`, pero matcheando por el `id`
 * REAL del referente curricular en vez de por grado — usar esta variante
 * siempre que ya se tenga un `ReferenteCurricular`/`UnidadReferente`
 * resuelto a mano (`useReferenteCurricularQuery`/`useUnidadReferenteQuery`,
 * que derivan por grado+ASIGNATURA), en vez de `resolveInstrumentoLabel`
 * (que solo agrupa por grado en `/planeador/unidades/tabs`). Evita que el
 * título ("Enunciado y evidencias del {instrumento}") diga un instrumento
 * distinto del que en verdad tienen `nivel1Etiqueta`/`nivel2Etiqueta` del
 * MISMO referente ya resuelto — pueden discrepar porque son dos funciones
 * de resolución distintas (`fn_docente_unidad_tabs_listar` agrupa por
 * grado; `fn_refcurr_por_grado_asignatura` desempata por área de la
 * asignatura, que puede dar un referente más específico).
 */
export function instrumentoLabelFromReferente(
  referenteId: number | null | undefined,
  unidadTabs: UnidadTab[] | undefined,
  fallback: string,
): string {
  return (referenteId != null && unidadTabs?.find((t) => t.referenteId === referenteId)?.instrumento) || fallback
}
