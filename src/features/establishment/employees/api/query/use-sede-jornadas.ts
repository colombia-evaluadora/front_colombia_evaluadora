import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

// Jornadas disponibles para asignar un funcionario, segun la sede elegida en
// el permiso: solo las que salen de un periodo academico ACTIVO de esa
// sede — nunca de años anteriores, y nunca una jornada "estandar" asumida
// sin que venga de un periodo real (`academico_test.fn_jornadas_activas_por_sede`).
//
// Antes el select de "Jornada" en dialog-manage.tsx usaba un catalogo
// generico (CATALOGS.WORK_SCHEDULES, categoria TLISTA_VALOR "JORNADA"), sin
// ninguna relacion con los periodos academicos reales de la sede.

interface SedeJornadaRow {
  id: number
  nombre: string
}

interface SedeJornadasResponse {
  rows: SedeJornadaRow[]
}

export interface SedeJornadaOption {
  id: number
  nombre: string
}

export async function fetchSedeJornadasActivas(sedeId: number): Promise<SedeJornadaOption[]> {
  const raw = await api.query<SedeJornadasResponse>("/eval-col/sedes/jornadas-activas", {
    FK_SEDE: sedeId,
  })
  return raw.rows ?? []
}

export const sedeJornadasActivasQueryKey = (sedeId: number | null) => [
  "sede-jornadas-activas",
  sedeId,
]

export function useSedeJornadasActivasQuery(sedeId: number | null) {
  return useQuery({
    queryKey: sedeJornadasActivasQueryKey(sedeId),
    queryFn: () => fetchSedeJornadasActivas(sedeId as number),
    enabled: sedeId != null,
  })
}

// Si la sede no tiene NINGUN periodo academico (ni activo ni inactivo), el
// front debe avisar "crea un periodo academico primero" en vez de mostrar el
// select de jornada vacio sin explicacion — ver fn_sede_tiene_periodos.
interface SedeTienePeriodosRow {
  tiene_periodos: boolean
}

interface SedeTienePeriodosResponse {
  rows: SedeTienePeriodosRow[]
}

async function fetchSedeTienePeriodos(sedeId: number): Promise<boolean> {
  const raw = await api.query<SedeTienePeriodosResponse>("/eval-col/sedes/tiene-periodos", {
    FK_SEDE: sedeId,
  })
  return raw.rows?.[0]?.tiene_periodos ?? false
}

export const sedeTienePeriodosQueryKey = (sedeId: number | null) => [
  "sede-tiene-periodos",
  sedeId,
]

export function useSedeTienePeriodosQuery(sedeId: number | null) {
  return useQuery({
    queryKey: sedeTienePeriodosQueryKey(sedeId),
    queryFn: () => fetchSedeTienePeriodos(sedeId as number),
    enabled: sedeId != null,
  })
}
