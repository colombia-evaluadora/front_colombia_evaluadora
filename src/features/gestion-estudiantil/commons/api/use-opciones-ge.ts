import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import {
  toAnio,
  toJornada,
  toSede,
  type AnioRow,
  type JornadaRow,
  type SedeRow,
} from "@/features/academic-management/reports/api/query/use-cascada-query"
import {
  toGrupo,
  type GruposPeriodoParams,
  type GrupoPeriodoRow,
} from "@/features/academic-management/reports/api/query/use-grupos-periodo-query"
import {
  toPeriodo,
  type PeriodosInformeParams,
  type PeriodoRow,
} from "@/features/academic-management/reports/api/query/use-periodos-informe-query"
import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"

/**
 * Cascada Sede → Año → Jornada → Grupo/Período propia de Gestión Estudiantil
 * (`/gestion-estudiantil/opciones/*`, V720). Mismo contrato que la de Informes,
 * pero con el gate de GE: quien no tiene menú de Informes también la ve.
 */
export const opcionesGeKeys = {
  all: ["gestion-estudiantil", "opciones"] as const,
  sedes: () => [...opcionesGeKeys.all, "sedes"] as const,
  anios: (sedeId: number | null) => [...opcionesGeKeys.all, "anos", sedeId] as const,
  jornadas: (sedeId: number | null, anio: number | null) => [...opcionesGeKeys.all, "jornadas", sedeId, anio] as const,
  grupos: (params: GruposPeriodoParams) => [...opcionesGeKeys.all, "grupos-periodo", params] as const,
  periodos: (params: PeriodosInformeParams) => [...opcionesGeKeys.all, "periodos", params] as const,
}

const BASE = "/gestion-estudiantil/opciones"

// Las fetch van sueltas para que la preparación sin conexión siembre las mismas keys.
export async function fetchSedesGe() {
  return (await evalCol.postRows<SedeRow>(`${BASE}/sedes`, {})).map(toSede)
}

export async function fetchAniosGe(sedeId: number | null) {
  return (await evalCol.postRows<AnioRow>(`${BASE}/anos`, { FK_TSEDE: sedeId })).map(toAnio)
}

export async function fetchJornadasGe(sedeId: number | null, anio: number | null) {
  return (await evalCol.postRows<JornadaRow>(`${BASE}/jornadas`, { FK_TSEDE: sedeId, ANIO: anio })).map(toJornada)
}

export async function fetchGruposPeriodoGe(params: GruposPeriodoParams) {
  return (
    await evalCol.postRows<GrupoPeriodoRow>(`${BASE}/grupos-periodo`, {
      FK_TSEDE: params.sedeId,
      ANIO: params.anio,
      FK_TLV_JORNADA: params.jornadaId,
      SEARCH: params.search?.trim() || null,
    })
  ).map(toGrupo)
}

export async function fetchPeriodosGe(params: PeriodosInformeParams) {
  return (
    await evalCol.postRows<PeriodoRow>(`${BASE}/periodos`, {
      FK_TSEDE: params.sedeId,
      ANIO: params.anio,
      FK_TLV_JORNADA: params.jornadaId,
    })
  ).map(toPeriodo)
}

export function useSedesGeQuery() {
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: opcionesGeKeys.sedes(),
    queryFn: fetchSedesGe,
    staleTime: 1000 * 60 * 10,
  })
}

export function useAniosGeQuery(sedeId: number | null) {
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: opcionesGeKeys.anios(sedeId),
    queryFn: () => fetchAniosGe(sedeId),
    enabled: sedeId != null,
    staleTime: 1000 * 60 * 10,
  })
}

export function useJornadasGeQuery(sedeId: number | null, anio: number | null) {
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: opcionesGeKeys.jornadas(sedeId, anio),
    queryFn: () => fetchJornadasGe(sedeId, anio),
    enabled: sedeId != null && anio != null,
    staleTime: 1000 * 60 * 10,
  })
}

export function useGruposPeriodoGeQuery(params: GruposPeriodoParams) {
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: opcionesGeKeys.grupos(params),
    queryFn: () => fetchGruposPeriodoGe(params),
    enabled: params.sedeId != null && params.anio != null && params.jornadaId != null,
    staleTime: 1000 * 60,
  })
}

export function usePeriodosGeQuery(params: PeriodosInformeParams) {
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: opcionesGeKeys.periodos(params),
    queryFn: () => fetchPeriodosGe(params),
    enabled: params.sedeId != null && params.anio != null && params.jornadaId != null,
    staleTime: 1000 * 60 * 5,
  })
}
