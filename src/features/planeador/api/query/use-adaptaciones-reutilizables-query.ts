import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/adaptaciones-reutilizables` —
 * `fn_actividad_adaptaciones_reutilizables_listar` (V471).
 *
 * La "biblioteca institucional" de adaptaciones: las plantillas (archivo)
 * ya subidas en OTRAS actividades, para reusarlas sin volver a cargarlas.
 * Mismo diseño y mismas reglas que `use-materiales-reutilizables-query.ts`
 * (V429) — ancla por actividad o grupo, resultados acotados al
 * establecimiento del ancla, solo trae adaptaciones CON archivo — pero
 * contra `TACTIVIDAD_ADAPTACION` en vez de `TACTIVIDAD_MATERIAL`: endpoint
 * aparte, decisión explícita (ver el comentario de V471).
 */
export interface AdaptacionReutilizable {
  archivoId: number
  nombreArchivo: string
  peso: number
  actividadOrigenId: number
  actividadOrigenTitulo: string
  tipoAdaptacionId: number
  tipoAdaptacion: string
  descripcion: string
}

interface AdaptacionReutilizableRow {
  fk_tarchivo: number
  nombre_archivo: string
  peso: number | null
  pk_tactividad_origen: number
  titulo_actividad_origen: string
  fk_tlv_tipo_adaptacion: number
  tipo_adaptacion: string
  descripcion: string | null
  total_count: number
}

export interface AdaptacionesReutilizablesPage {
  items: AdaptacionReutilizable[]
  totalCount: number
}

function toAdaptacion(row: AdaptacionReutilizableRow): AdaptacionReutilizable {
  return {
    archivoId: row.fk_tarchivo,
    nombreArchivo: row.nombre_archivo,
    peso: row.peso ?? 0,
    actividadOrigenId: row.pk_tactividad_origen,
    actividadOrigenTitulo: row.titulo_actividad_origen,
    tipoAdaptacionId: row.fk_tlv_tipo_adaptacion,
    tipoAdaptacion: row.tipo_adaptacion,
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

async function fetchAdaptacionesReutilizables({
  actividadId,
  grupoId,
  search,
  pagina,
  size,
}: Params): Promise<AdaptacionesReutilizablesPage> {
  const qs = new URLSearchParams({ PAGINA: String(pagina), SIZE: String(size) })
  if (actividadId > 0) qs.set("ACTIVIDAD", String(actividadId))
  else if (grupoId > 0) qs.set("GRUPO", String(grupoId))
  if (search.trim()) qs.set("SEARCH", search.trim())

  const rows = await evalCol.getRows<AdaptacionReutilizableRow>(
    `/planeador/adaptaciones-reutilizables?${qs}`,
  )
  return {
    items: rows.map(toAdaptacion),
    totalCount: rows[0]?.total_count ?? 0,
  }
}

export const adaptacionesReutilizablesQueryKey = (params: Params) =>
  ["planeador", "adaptaciones-reutilizables", params] as const

/**
 * `enabled` cubre los mismos dos casos que la biblioteca de materiales: el
 * combobox cerrado/sin abrir (no hace falta consultar hasta que el docente
 * lo abre) y no tener ningún ancla todavía (al crear, hasta elegir grupo).
 */
export function useAdaptacionesReutilizablesQuery(params: Params, enabled: boolean) {
  return useQuery({
    queryKey: adaptacionesReutilizablesQueryKey(params),
    queryFn: () => fetchAdaptacionesReutilizables(params),
    enabled: enabled && (params.actividadId > 0 || params.grupoId > 0),
    staleTime: 1000 * 60,
  })
}
