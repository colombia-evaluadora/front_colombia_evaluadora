import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"
import { filtrosBase } from "@/features/coverage/informes-reportes/api/resumenes"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

// Informes de Reservas y Admisión (C.4.COB).

const BASE = "/informes-reportes"
type Fila = Record<string, string | number | null>

/** Filtros que manda cada informe; los reusa el export. */
export const filtrosCobertura = {
  cupos: filtrosBase,
  "reservas-confirmar": filtrosBase,
  traslados: (s: InformesSearch) => ({
    PERIODO: s.periodo ?? null,
    DIRECCION: s.direccion ?? null,
    ESTADO: s.estadoTraslado ?? null,
    GRADO: s.grado ?? null,
  }),
  inscripciones: (s: InformesSearch) => ({
    GRUPO_ADMISION: s.grupoAdmision ?? null,
    SEDE: s.sede || null,
    JORNADA: s.jornada || null,
    GRADO: s.grado ?? null,
    SITUACION_EDAD: s.edad ?? null,
  }),
  demanda: (s: InformesSearch) => ({
    PERIODO: s.periodo ?? null,
    GRADO: s.grado ?? null,
    MODALIDAD: null,
    MUNICIPIO: null,
    ORIGEN: null,
  }),
} as const

export type InformeCobertura = keyof typeof filtrosCobertura

/** Informes de resumen: todas las filas, sin paginar. */
export function useResumenCoberturaQuery(informe: "cupos" | "inscripciones" | "demanda", s: InformesSearch) {
  const body = filtrosCobertura[informe](s)
  return useQuery({
    queryKey: [...informesKeys.all, informe, body] as const,
    queryFn: async () => camelizar<Fila[]>(await evalCol.postRows(`${BASE}/${informe}/query`, body)),
    placeholderData: keepPreviousData,
  })
}

/** Informes de lista: paginados en el back. */
export function useListaCoberturaQuery(
  informe: "reservas-confirmar" | "traslados",
  s: InformesSearch,
  p: { pageIndex: number; pageSize: number },
) {
  const body = { ...filtrosCobertura[informe](s), PAGEINDEX: p.pageIndex, PAGESIZE: p.pageSize }
  return useQuery({
    queryKey: [...informesKeys.all, informe, body] as const,
    queryFn: async () => {
      const rows = await evalCol.postRows<Fila & { total_count: number }>(`${BASE}/${informe}/query`, body)
      return toPaginated(rows, { pageSize: p.pageSize, map: (r) => camelizar<Fila>(r) })
    },
    placeholderData: keepPreviousData,
  })
}

export interface GrupoAdmision {
  id: number
  nombre: string
  sorteoEjecutadoAt: string | null
}

export function useGruposAdmisionQuery() {
  return useQuery({
    queryKey: [...informesKeys.all, "grupos-admision"] as const,
    queryFn: async () => camelizar<GrupoAdmision[]>(await evalCol.getRows(`${BASE}/grupos-admision`)),
    staleTime: 5 * 60_000,
  })
}

export interface ListaSorteo {
  grupoAdmision?: string
  fechaSorteo?: string | null
  rows?: { posicion: number; numeroInscripcion: string; prioridad: string; numeroSorteo: string | null; estadoOpcion: string }[]
}

export function useListaSorteoQuery(s: InformesSearch, grado: string | null) {
  const body = { GRUPO_ADMISION: s.grupoAdmision ?? null, GRADO: grado, JORNADA: s.jornada || null }
  return useQuery({
    queryKey: [...informesKeys.all, "lista-sorteo", body] as const,
    queryFn: async () => {
      const [fila] = await evalCol.postRows<{ lista: unknown }>(`${BASE}/lista-sorteo`, body)
      return camelizar<ListaSorteo>(fila?.lista ?? {})
    },
    enabled: Boolean(s.grupoAdmision && grado && s.jornada),
  })
}
