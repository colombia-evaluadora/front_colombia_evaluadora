import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"

import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type { Continuidad, EstadoContinuidad } from "@/features/coverage/matricula-complementaria/api/types"

// Pestaña Continuidad (Sección 2.16.2, Continuidad automática). Pendiente en el
// back (docs/matricula/pendientes-back.md, tarea 15).

const BASE = "/cobertura-academica/matricula-complementaria/continuidad"

const all = ["matricula-complementaria", "continuidad"] as const
export const continuidadKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  grupos: (id: number) => [...all, id, "grupos"] as const,
}

export interface ContinuidadParams {
  search?: string
  convocatoria?: number
  estado?: EstadoContinuidad
  especialidad?: string
  pageIndex: number
  pageSize: number
}

export async function fetchContinuidad(p: ContinuidadParams) {
  const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/query`, {
    SEARCH: p.search || null,
    FK_CONVOCATORIA: p.convocatoria ?? null,
    ESTADO: p.estado ?? null,
    ESPECIALIDAD: p.especialidad || null,
    PAGE_INDEX: p.pageIndex,
    PAGE_SIZE: p.pageSize,
  })
  return toPaginated(rows, { pageSize: p.pageSize, map: (r) => camelizar<Continuidad>(r) })
}

export function useContinuidadQuery(p: ContinuidadParams) {
  return useQuery({
    queryKey: continuidadKeys.lista(p),
    queryFn: () => fetchContinuidad(p),
    placeholderData: keepPreviousData,
  })
}

/** Grupos que dictan la especialidad, con cupo, en el período del grado siguiente. */
export function useGruposContinuidadQuery(id: number) {
  return useQuery({
    queryKey: continuidadKeys.grupos(id),
    queryFn: async () =>
      camelizar<{ id: number; codigo: string; cupo: number; libres: number }[]>(await evalCol.getRows(`${BASE}/${id}/grupos`)),
    staleTime: 0,
  })
}

export function useAsignarGrupoContinuidad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; grupoId: number }) => evalCol.postRow(`${BASE}/${v.id}/asignar-grupo`, { FK_TGRUPO: v.grupoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: continuidadKeys.all })
      invalidarMatriculas(queryClient)
    },
  })
}
