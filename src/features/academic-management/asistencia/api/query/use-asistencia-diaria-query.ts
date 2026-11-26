import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { asistenciaKeys } from "@/features/academic-management/asistencia/api/query-keys"
import type {
  DiariaBloqueRow,
  DiariaCalendarioParams,
  DiariaCalendarioRow,
  DiariaGrupoRow,
  DiariaPlanillaParams,
  DiariaPlanillaRow,
  DiariaPorGrupoRow,
} from "@/features/academic-management/asistencia/api/types/asistencia-diaria"
import { toEntradaDiaria } from "@/features/academic-management/asistencia/utils/asistencia-diaria"

// El back real envuelve en { rows }; el mock devuelve el array.
async function getRows<T>(url: string, params: object): Promise<T[]> {
  const raw = await api.get<{ rows: T[] } | T[]>(url, { params })
  return Array.isArray(raw) ? raw : (raw.rows ?? [])
}

export const fetchDiariaCalendario = async (params: DiariaCalendarioParams) =>
  (await getRows<DiariaCalendarioRow>("/eval-col/asistencias/diaria/calendario", params)).map(toEntradaDiaria)

export const fetchDiariaPlanilla = async (params: DiariaPlanillaParams) =>
  (await getRows<DiariaPlanillaRow>("/eval-col/asistencias/diaria/planilla", params)).map((r) => ({
    ...r,
    bloque_llegada: r.bloque_llegada == null ? null : Number(r.bloque_llegada),
  }))

export const fetchDiariaBloques = (params: DiariaPlanillaParams) =>
  getRows<DiariaBloqueRow>("/eval-col/asistencias/diaria/bloques", params)

export const fetchDiariaGrupos = (sede: number | null) =>
  getRows<DiariaGrupoRow>("/eval-col/asistencias/diaria/grupos", { SEDE: sede })

/** Regla 115: una entrada por día hábil y grupo Diaria donde el usuario registra (V747). */
export function useAsistenciaDiariaCalendarioQuery(params: DiariaCalendarioParams, enabled = true) {
  return useQuery({
    queryKey: asistenciaKeys.diaria.calendario(params),
    queryFn: () => fetchDiariaCalendario(params),
    enabled,
  })
}

export function useAsistenciaDiariaPlanillaQuery(params: DiariaPlanillaParams | null) {
  return useQuery({
    queryKey: asistenciaKeys.diaria.planilla(params ?? "none"),
    queryFn: () => fetchDiariaPlanilla(params!),
    enabled: params != null,
  })
}

/** Horario del grupo ese día; vacío = sin horario y no se ofrece el bloque de llegada. */
export function useAsistenciaDiariaBloquesQuery(params: DiariaPlanillaParams | null) {
  return useQuery({
    queryKey: asistenciaKeys.diaria.bloques(params ?? "none"),
    queryFn: () => fetchDiariaBloques(params!),
    enabled: params != null,
    staleTime: 5 * 60_000,
  })
}

/** Días de la planilla diaria en el período, para los totales del estudiante (el día cuenta una vez). */
export function useAsistenciaDiariaPorGrupoQuery(params: { GRUPO: number; PERIODO: number } | null) {
  return useQuery({
    queryKey: asistenciaKeys.diaria.porGrupo(params ?? "none"),
    queryFn: () => getRows<DiariaPorGrupoRow>("/eval-col/asistencias/diaria/por-grupo", params!),
    enabled: params != null,
    placeholderData: (prev) => prev,
  })
}

/** Grupos Diaria que el usuario consulta (docente: solo sus asignaturas y sin registrar). */
export function useAsistenciaDiariaGruposQuery(sede: number | null) {
  return useQuery({
    queryKey: asistenciaKeys.diaria.grupos(sede ?? "none"),
    queryFn: () => fetchDiariaGrupos(sede),
    enabled: sede != null,
    staleTime: 5 * 60_000,
  })
}
