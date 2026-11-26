import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

// Informes de resumen de Informes y reportes (C.4.MAT): filtros en fila, sin búsqueda.

const BASE = "/informes-reportes"

/** Filtros comunes (Sede, Jornada, Período, Grado); los reusa el export. */
export const filtrosBase = (s: InformesSearch) => ({
  PERIODO: s.periodo ?? null,
  SEDE: s.sede || null,
  JORNADA: s.jornada || null,
  GRADO: s.grado ?? null,
})

export const filtrosInformeMatricula = (s: InformesSearch) => ({
  ...filtrosBase(s),
  TIPO: s.tipo ?? null,
  SITUACION_EDAD: s.edad ?? null,
})

export interface FilaInformeMatricula {
  gradoCodigo: number | null
  grado: string
  grupo: string
  sede: string
  jornada: string
  principales: number
  complementarias: number
  adscritos: number
  total: number
  extraedad: number
}

export function useInformeMatriculaQuery(s: InformesSearch) {
  const body = filtrosInformeMatricula(s)
  return useQuery({
    queryKey: [...informesKeys.all, "matricula", body] as const,
    queryFn: async () =>
      (await evalCol.postRows<Record<string, unknown>>(`${BASE}/matricula/query`, body)).map((r) => {
        const f = camelizar<FilaInformeMatricula>(r)
        // bigint llega como texto.
        for (const k of ["principales", "complementarias", "adscritos", "total", "extraedad"] as const) f[k] = Number(f[k])
        return f
      }),
    placeholderData: keepPreviousData,
  })
}

export interface Nivelacion {
  matriculaId: number
  documento: string
  estudiante: string
  grupo: string
  asignatura: string
  responsable: string | null
  periodos: string
  motivo: string
}

export function useNivelacionesQuery(s: InformesSearch, p: { pageIndex: number; pageSize: number }) {
  const body = { ...filtrosBase(s), PAGEINDEX: p.pageIndex, PAGESIZE: p.pageSize }
  return useQuery({
    queryKey: [...informesKeys.all, "nivelaciones", body] as const,
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/nivelaciones/query`, body)
      return toPaginated(rows, { pageSize: p.pageSize, map: (r) => camelizar<Nivelacion>(r) })
    },
    placeholderData: keepPreviousData,
  })
}
