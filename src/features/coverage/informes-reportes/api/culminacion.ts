import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { downloadReport } from "@/lib/report-client"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

// Certificados de culminación (C.4.CUL; Sección 4.8, Regla 68): V792/V793 del SSO.
// Noveno y Transición tienen certificado propio; Quinto usa el certificado de calificaciones.

const BASE = "/informes-reportes/culminacion"
const culminacionKeys = {
  all: [...informesKeys.all, "culminacion"] as const,
  grados: (periodo: number | "none") => [...informesKeys.all, "culminacion", "grados", periodo] as const,
  lista: (body: unknown) => [...informesKeys.all, "culminacion", "lista", body] as const,
}

export type NivelCulminacion = "PREESCOLAR" | "PRIMARIA" | "BASICA"

export interface Culminante {
  matriculaId: string
  documento: string
  estudiante: string
  grado: string
  grupo: string
  nivel: NivelCulminacion
  numero: string | null
  generado: boolean
  generadoEn: string | null
}

export const CERTIFICADO_POR_NIVEL: Record<NivelCulminacion, string> = {
  BASICA: "Certificado de estudios del Bachillerato Básico",
  PRIMARIA: "Certificado de calificaciones",
  PREESCOLAR: "Certificado de estudios de Preescolar",
}

/** Filtros de la lista; los reusa el export. */
export const filtrosCulminacion = (s: InformesSearch) => ({
  PERIODO: s.periodo ?? null,
  SEDE: s.sede || null,
  JORNADA: s.jornada || null,
  GRADO: s.grado ?? null,
  GRUPO: s.grupo || null,
  BUSCAR: s.q || null,
})

export function useGradosFinNivelQuery(periodo?: number) {
  return useQuery({
    queryKey: culminacionKeys.grados(periodo ?? "none"),
    queryFn: async () =>
      camelizar<{ gradoId: number; grado: string; nivel: NivelCulminacion }[]>(await evalCol.getRows(`${BASE}/grados/${periodo}`)),
    enabled: Boolean(periodo),
    staleTime: Infinity,
  })
}

export function useCulminacionQuery(s: InformesSearch, p: { pageIndex: number; pageSize: number }) {
  const body = { ...filtrosCulminacion(s), PAGEINDEX: p.pageIndex, PAGESIZE: p.pageSize }
  return useQuery({
    queryKey: culminacionKeys.lista(body),
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/query`, body)
      return toPaginated(rows, {
        pageSize: p.pageSize,
        map: (r) => {
          const c = camelizar<Culminante & { matriculaId: number }>(r)
          return { ...c, matriculaId: String(c.matriculaId) } as Culminante
        },
      })
    },
    placeholderData: keepPreviousData,
  })
}

/** Un solo PDF con el certificado de Noveno o Transición de cada matrícula; la primera emisión numera Noveno. */
export function useGenerarCulminacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (v: { ids: string[] }) => {
      const r = await downloadReport("informes-certificados-culminacion", { format: "pdf", filters: { IDS: v.ids.map(Number) } })
      if (r.status !== "ok") throw new Error(r.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: culminacionKeys.all }),
  })
}

export const invalidarCulminacion = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({ queryKey: culminacionKeys.all })
