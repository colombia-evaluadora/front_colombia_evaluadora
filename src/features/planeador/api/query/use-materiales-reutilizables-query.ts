import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/materiales-reutilizables` —
 * `fn_actividad_materiales_reutilizables_listar` (V429).
 *
 * Es la "Biblioteca de recursos": los archivos que ya se subieron **en otras
 * actividades**, para volver a usarlos sin cargarlos de nuevo.
 *
 * Cuatro cosas que condicionan cómo se usa, medidas contra el servidor y no
 * supuestas:
 *
 * 1. **Solo trae materiales CON archivo** (`m.FK_TARCHIVO IS NOT NULL`). Los
 *    de tipo URL y unidad virtual no entran: no hay nada que "reutilizar" en
 *    un enlace, se copia y ya.
 * 2. **Hay que mandar un ancla: la actividad o el grupo.** El backend
 *    resuelve con ella el alcance territorial del usuario, y sin ninguna de
 *    las dos responde `22023`. Al editar se manda la actividad (que además
 *    el backend excluye de la galería, para no ofrecer sus propios
 *    archivos); al crear todavía no hay id, así que se manda el grupo, que
 *    el formulario ya tiene elegido. Antes de V429 solo servía el primer
 *    caso: sin actividad el gate respondía `42501` y por eso la biblioteca
 *    no se podía usar en el alta.
 * 3. **Los resultados se acotan al establecimiento** de ese ancla — no a
 *    quien pregunta: la idea es reusar también lo que subió un colega del
 *    mismo colegio.
 * 4. **Pagina y busca del lado del servidor** (`PAGINA`, `SIZE`, `SEARCH`
 *    contra el nombre del archivo), así que no se trae todo para filtrar acá.
 */
export interface MaterialReutilizable {
  archivoId: number
  nombreArchivo: string
  peso: number
  actividadOrigenId: number
  actividadOrigenTitulo: string
  tipoRecursoId: number
  tipoRecurso: string
  descripcion: string
}

interface MaterialReutilizableRow {
  fk_tarchivo: number
  nombre_archivo: string
  peso: number | null
  pk_tactividad_origen: number
  titulo_actividad_origen: string
  fk_tlv_tipo_recurso: number
  tipo_recurso: string
  descripcion: string | null
  total_count: number
}

export interface MaterialesReutilizablesPage {
  items: MaterialReutilizable[]
  totalCount: number
}

function toMaterial(row: MaterialReutilizableRow): MaterialReutilizable {
  return {
    archivoId: row.fk_tarchivo,
    nombreArchivo: row.nombre_archivo,
    peso: row.peso ?? 0,
    actividadOrigenId: row.pk_tactividad_origen,
    actividadOrigenTitulo: row.titulo_actividad_origen,
    tipoRecursoId: row.fk_tlv_tipo_recurso,
    tipoRecurso: row.tipo_recurso,
    descripcion: row.descripcion ?? "",
  }
}

interface Params {
  /** 0 mientras se CREA la actividad: ahí manda `grupoId`. */
  actividadId: number
  /** El grupo elegido en el formulario. Es el ancla del alta. */
  grupoId: number
  search: string
  /** 1-based, igual que `p_pagina` en el backend. */
  pagina: number
  size: number
}

async function fetchMaterialesReutilizables({
  actividadId,
  grupoId,
  search,
  pagina,
  size,
}: Params): Promise<MaterialesReutilizablesPage> {
  const qs = new URLSearchParams({ PAGINA: String(pagina), SIZE: String(size) })
  // La actividad manda cuando existe: además de anclar el alcance, el backend
  // la excluye de la galería. Si no existe todavía, va el grupo.
  if (actividadId > 0) qs.set("ACTIVIDAD", String(actividadId))
  else if (grupoId > 0) qs.set("GRUPO", String(grupoId))
  // Una búsqueda vacía se OMITE en vez de mandarse como cadena vacía: el
  // binder no acepta `""` para un VARCHAR opcional.
  if (search.trim()) qs.set("SEARCH", search.trim())

  const rows = await evalCol.getRows<MaterialReutilizableRow>(
    `/planeador/materiales-reutilizables?${qs}`,
  )
  return {
    items: rows.map(toMaterial),
    // `total_count` viaja repetido en cada fila (window function). Sin filas
    // no hay de dónde sacarlo, y cero es la respuesta correcta.
    totalCount: rows[0]?.total_count ?? 0,
  }
}

export const materialesReutilizablesQueryKey = (params: Params) =>
  ["planeador", "materiales-reutilizables", params] as const

/**
 * `enabled` cubre los dos casos en que la llamada no tiene sentido: el
 * diálogo cerrado (vive montado junto al formulario, así que sin esto
 * consultaría al abrir la actividad) y no tener ningún ancla todavía —
 * al crear, hasta que no se elige el grupo el backend no puede resolver el
 * alcance y respondería 22023.
 */
export function useMaterialesReutilizablesQuery(params: Params, enabled: boolean) {
  return useQuery({
    queryKey: materialesReutilizablesQueryKey(params),
    queryFn: () => fetchMaterialesReutilizables(params),
    enabled: enabled && (params.actividadId > 0 || params.grupoId > 0),
    staleTime: 1000 * 60,
  })
}
