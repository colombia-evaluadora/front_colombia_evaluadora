import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"

import { camelizar, convocatoriaKeys } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type {
  Convenio,
  OpcionesConvenio,
  PreviaAceptar,
  PreviaRenovar,
} from "@/features/coverage/matricula-complementaria/api/types"

// Convenios de adscripción (Sección 2.16.1). Pendiente en el back
// (docs/matricula/pendientes-back.md, tarea 14).

const BASE = "/cobertura-academica/matricula-complementaria/convenios"

const all = ["matricula-complementaria", "convenios"] as const
const detalle = (id: number) => [...all, id] as const
export const convenioKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  opciones: [...all, "opciones"] as const,
  aceptar: (id: number) => [...detalle(id), "aceptar"] as const,
  renovar: (id: number) => [...detalle(id), "renovar"] as const,
}

export interface ConveniosParams {
  search?: string
  anio?: number
  /** Roles territoriales: establecimiento elegido. */
  establecimiento?: number
  pageIndex: number
  pageSize: number
}

export async function fetchConvenios(p: ConveniosParams) {
  const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/query`, {
    SEARCH: p.search || null,
    ANIO: p.anio ?? null,
    ESTABLECIMIENTO: p.establecimiento ?? null,
    PAGE_INDEX: p.pageIndex,
    PAGE_SIZE: p.pageSize,
  })
  return toPaginated(rows, { pageSize: p.pageSize, map: (r) => camelizar<Convenio>(r) })
}

export function useConveniosQuery(p: ConveniosParams) {
  return useQuery({
    queryKey: convenioKeys.lista(p),
    queryFn: () => fetchConvenios(p),
    placeholderData: keepPreviousData,
  })
}

export function useOpcionesConvenioQuery() {
  return useQuery({
    queryKey: convenioKeys.opciones,
    queryFn: async () => camelizar<OpcionesConvenio>(await evalCol.getRow(`${BASE}/opciones`)),
  })
}

export function usePreviaAceptarQuery(id: number) {
  return useQuery({
    queryKey: convenioKeys.aceptar(id),
    queryFn: async () => camelizar<PreviaAceptar>(await evalCol.getRow(`${BASE}/${id}/aceptar/previa`)),
    staleTime: 0,
  })
}

export function usePreviaRenovarQuery(id: number) {
  return useQuery({
    queryKey: convenioKeys.renovar(id),
    queryFn: async () => camelizar<PreviaRenovar>(await evalCol.getRow(`${BASE}/${id}/renovar/previa`)),
    staleTime: 0,
  })
}

function useMutacion<V>(fn: (v: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: convenioKeys.all })
      // Los orígenes de las convocatorias salen de los convenios Aceptados.
      queryClient.invalidateQueries({ queryKey: convocatoriaKeys.all })
    },
  })
}

export const useCrearConvenios = () =>
  useMutacion(
    (v: { origenIds: number[]; periodoIds: number[]; gradoIds: number[]; especialidadIds: number[]; cupoMaximo: number | null; documentos: string[] }) =>
      evalCol.postRows(BASE, {
        ORIGENES: v.origenIds,
        PERIODOS: v.periodoIds,
        GRADOS: v.gradoIds,
        ESPECIALIDADES: v.especialidadIds,
        CUPO_MAXIMO: v.cupoMaximo,
        DOCUMENTOS: v.documentos,
      }),
  )

export const useAceptarConvenio = () =>
  useMutacion((v: { id: number; vinculos: { especialidadId: number; sedeId: number; accion: "VINCULAR" | "CREAR" }[] }) =>
    evalCol.put(`${BASE}/${v.id}/aceptar`, {
      VINCULOS: v.vinculos.map((x) => ({ FK_ESPECIALIDAD: x.especialidadId, SEDE: x.sedeId, ACCION: x.accion })),
    }),
  )

export const useRechazarConvenio = () =>
  useMutacion((v: { id: number; motivo: string }) => evalCol.put(`${BASE}/${v.id}/rechazar`, { MOTIVO: v.motivo }))

export const useFinalizarConvenio = () =>
  useMutacion((v: { id: number; motivo: string }) => evalCol.put(`${BASE}/${v.id}/finalizar`, { MOTIVO: v.motivo }))

export const useRenovarConvenio = () =>
  useMutacion((v: { id: number; periodoIds: number[] }) => evalCol.postRow(`${BASE}/${v.id}/renovar`, { PERIODOS: v.periodoIds }))

/** Acciones del menú ⁞ (Sección 2.16.1, Comportamiento). */
export function accionesConvenio(c: Convenio) {
  return {
    // El origen responde la propuesta.
    responder: c.estado === "PROPUESTO" && !c.soyReceptor,
    renovar: c.soyReceptor && (c.estado === "ACEPTADO" || c.estado === "FINALIZADO"),
    // Cualquiera de las partes lo finaliza; mientras está Propuesto, solo el que lo propuso.
    finalizar: c.estado === "ACEPTADO" || (c.estado === "PROPUESTO" && c.soyReceptor),
  }
}
