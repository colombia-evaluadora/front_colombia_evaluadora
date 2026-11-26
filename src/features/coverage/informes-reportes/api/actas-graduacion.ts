import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { downloadReport } from "@/lib/report-client"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"

// Actas de graduación (C.4.ACT; Sección 4.8, Regla 66): V788/V789 del SSO.

const BASE = "/informes-reportes/graduacion/actas"
const actasKeys = {
  all: [...informesKeys.all, "actas-graduacion"] as const,
  lista: (body: unknown) => [...informesKeys.all, "actas-graduacion", "lista", body] as const,
  graduados: (id: string) => [...informesKeys.all, "actas-graduacion", "graduados", id] as const,
}

export interface ActaGraduacion {
  actaId: string
  numero: string
  fecha: string
  modalidad: "CEREMONIA" | "VENTANILLA"
  libro: number
  folio: number
  graduados: number
  emitida: boolean
}

export interface GraduadoActa {
  n: number
  matriculaId: number
  documento: string
  estudiante: string
  titulo: string
  diploma: string | null
  entrega: string | null
}

export const anioActas = (anio?: number) => anio ?? new Date().getFullYear()

export function useActasGraduacionQuery(anio: number, p: { pageIndex: number; pageSize: number }) {
  const body = { ANIO: anio, PAGEINDEX: p.pageIndex, PAGESIZE: p.pageSize }
  return useQuery({
    queryKey: actasKeys.lista(body),
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/query`, body)
      return toPaginated(rows, {
        pageSize: p.pageSize,
        map: (r) => {
          const a = camelizar<ActaGraduacion & { actaId: number }>(r)
          return { ...a, actaId: String(a.actaId) } as ActaGraduacion
        },
      })
    },
    placeholderData: keepPreviousData,
  })
}

export function useGraduadosActaQuery(actaId: string) {
  return useQuery({
    queryKey: actasKeys.graduados(actaId),
    queryFn: async () => camelizar<GraduadoActa[]>(await evalCol.getRows(`${BASE}/${actaId}/graduados`)),
  })
}

function useDescarga<V>(fn: (v: V) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: actasKeys.all }) })
}

/** Cada generación es una copia firmada con QR (Decreto 180 de 1981, art. 8). */
export const useGenerarActas = () =>
  useDescarga(async (v: { ids: string[] }) => {
    const r = await downloadReport("informes-actas-graduacion", { format: "pdf", filters: { IDS: v.ids.map(Number) } })
    if (r.status !== "ok") throw new Error(r.message)
  })

/** Índice y todas las actas del año en orden de folio. */
export const useGenerarLibroActas = () =>
  useDescarga(async (v: { anio: number }) => {
    const r = await downloadReport("informes-libro-actas", { format: "pdf", filters: { ANIO: v.anio } })
    if (r.status !== "ok") throw new Error(r.message)
  })
