import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/adaptaciones-reutilizables` —
 * `fn_actividad_adaptaciones_reutilizables_listar` (V471, reescrito sobre
 * `_listar_interno` en V496.2/Regla 50).
 *
 * La "biblioteca del propio docente": archivos Y enlaces que el solicitante
 * registró como versión modificada en OTRAS actividades (ya no es la
 * biblioteca de todo el establecimiento — Regla 50). Una fila por recurso;
 * al elegirlo se referencia, no se duplica. `?tipoAdaptacion=` acota por el
 * tipo ya elegido en el formulario.
 */
export interface AdaptacionReutilizable {
  /** Archivo principal (contrato anterior, un solo archivo) — `undefined`
   *  si la adaptación de origen se guardó como solo-enlace. */
  archivoId?: number
  nombreArchivo?: string
  /** El enlace, si la adaptación de origen se guardó como `ENLACE`. */
  url?: string
  /** Rótulo que el docente le dio a la plantilla al guardarla (sso V496.1,
   *  `NOMBRE_PLANTILLA`) — `undefined` en plantillas de antes de ese cambio;
   *  ahí se cae a `nombreArchivo`. */
  nombrePlantilla?: string
  peso: number
  /** La fila de adaptación de origen — es el dato que identifica la
   *  plantilla de forma única (un archivo puede repetirse entre adaptaciones
   *  distintas), útil como `key` en listas. */
  pkTactividadAdaptacion: number
  /** Hasta 3 archivos (contrato nuevo, `TACTIVIDAD_ADAPTACION_ARCHIVO`) —
   *  mismo shape que `Adaptacion.archivos` en el formulario. */
  archivos: { fkTarchivo: number; nombre: string; peso: number }[]
  actividadOrigenId: number
  actividadOrigenTitulo: string
  tipoAdaptacionId: number
  tipoAdaptacion: string
  descripcion: string
}

interface AdaptacionReutilizableArchivoRow {
  fkTarchivo: number
  nombre: string
  peso: number
}

interface AdaptacionReutilizableRow {
  fk_tarchivo: number | null
  nombre_archivo: string | null
  url: string | null
  nombre_plantilla: string | null
  peso: number | null
  pk_tactividad_adaptacion: number
  archivos: AdaptacionReutilizableArchivoRow[] | null
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
    archivoId: row.fk_tarchivo ?? undefined,
    nombreArchivo: row.nombre_archivo ?? undefined,
    url: row.url ?? undefined,
    nombrePlantilla: row.nombre_plantilla ?? undefined,
    peso: row.peso ?? 0,
    pkTactividadAdaptacion: row.pk_tactividad_adaptacion,
    archivos: row.archivos ?? [],
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
  /** `pk` de `TIPO_ADAPTACION` ya elegido en el campo 1 del constructor —
   *  filtro por defecto, Regla 50. `undefined`/0 = sin filtrar. */
  tipoAdaptacionId: number | undefined
  search: string
  /** 1-based, igual que `p_pagina` en el backend. */
  pagina: number
  size: number
}

async function fetchAdaptacionesReutilizables({
  actividadId,
  grupoId,
  tipoAdaptacionId,
  search,
  pagina,
  size,
}: Params): Promise<AdaptacionesReutilizablesPage> {
  const qs = new URLSearchParams({ PAGINA: String(pagina), SIZE: String(size) })
  if (actividadId > 0) qs.set("ACTIVIDAD", String(actividadId))
  else if (grupoId > 0) qs.set("GRUPO", String(grupoId))
  if (tipoAdaptacionId) qs.set("TIPO_ADAPTACION", String(tipoAdaptacionId))
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
