import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { PIAR, piarKeys } from "@/features/gestion-estudiantil/inclusion/piar/api/query-keys"
import type {
  AsignaturaOpcion,
  MatriculaDisponible,
  ParticipanteOpcion,
  PeriodoEvaluacionOpcion,
  PiarDetalle,
  PiarFiltros,
  PiarHistorial,
  PiarRow,
  SinPiarRow,
} from "@/features/gestion-estudiantil/inclusion/piar/api/types"


const id = (value: string) => (value ? Number(value) : null)

export function toPiarFilters(search: string, f: PiarFiltros) {
  return {
    SEARCH: search.trim() || null,
    FK_SEDE: id(f.sede),
    FK_JORNADA: id(f.jornada),
    FK_GRUPO: id(f.grupo),
    FK_ESTADO: id(f.estado),
    CONDICION: f.condicion || null,
    CON_PENDIENTES: f.pendientes ? f.pendientes === "SI" : null,
  }
}

export function usePiarListaQuery(params: { search: string; filtros: PiarFiltros; pageIndex: number; pageSize: number }) {
  return useQuery({
    queryKey: piarKeys.lista(params),
    queryFn: async () => {
      const rows = await evalCol.postRows<PiarRow>(`${PIAR}/query`, {
        FILTERS: toPiarFilters(params.search, params.filtros),
        PAGEINDEX: params.pageIndex,
        PAGESIZE: params.pageSize,
      })
      const totalCount = rows[0]?.total_count ?? 0
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    placeholderData: keepPreviousData,
  })
}

export function useSinPiarQuery(sede = "", jornada = "", enabled = true) {
  return useQuery({
    enabled,
    queryKey: piarKeys.aviso(sede, jornada),
    queryFn: () => {
      const q = new URLSearchParams()
      if (sede) q.set("FK_SEDE", sede)
      if (jornada) q.set("FK_JORNADA", jornada)
      const qs = q.toString()
      return evalCol.getRows<SinPiarRow>(`${PIAR}/aviso-sin-piar${qs ? `?${qs}` : ""}`)
    },
    staleTime: 60_000,
  })
}

/** Selector de NUE.1: incluye a quien no tiene condición; el backend limita a 50 por búsqueda. */
export function useMatriculasDisponiblesQuery(search: string) {
  return useQuery({
    queryKey: ["piar", "matriculas", search],
    queryFn: () => evalCol.getRows<MatriculaDisponible>(`${PIAR}/matriculas-disponibles${search ? `?SEARCH=${encodeURIComponent(search)}` : ""}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/** Las funciones que devuelven JSONB llegan como `{ resultado }` en una sola fila. */
const piarQueryOptions = (piarId: number) => ({
  queryKey: piarKeys.detalle(piarId),
  queryFn: () => evalCol.getRow<{ resultado: PiarDetalle }>(`${PIAR}/${piarId}`).then((r) => r.resultado),
})

export function usePiarQuery(piarId: number) {
  return useQuery(piarQueryOptions(piarId))
}

export function usePiarHistorialQuery(piarId: number) {
  return useQuery({
    queryKey: piarKeys.historial(piarId),
    queryFn: () => evalCol.getRow<{ resultado: PiarHistorial }>(`${PIAR}/${piarId}/historial`).then((r) => r.resultado),
  })
}

export function useAsignaturasPiarQuery(piarId: number, enabled = true) {
  return useQuery({
    queryKey: piarKeys.opciones(piarId, "asignaturas"),
    queryFn: () => evalCol.getRows<AsignaturaOpcion>(`${PIAR}/${piarId}/opciones/asignaturas`),
    enabled,
  })
}

export function usePeriodosPiarQuery(piarId: number, ajuste: number | undefined) {
  return useQuery({
    queryKey: piarKeys.opciones(piarId, "periodos", ajuste),
    queryFn: () => evalCol.getRows<PeriodoEvaluacionOpcion>(`${PIAR}/${piarId}/opciones/periodos-evaluacion?AJUSTE=${ajuste}`),
    enabled: ajuste != null,
  })
}

export function useParticipantesOpcionQuery(piarId: number, enabled: boolean) {
  return useQuery({
    queryKey: piarKeys.opciones(piarId, "participantes"),
    queryFn: () => evalCol.getRows<ParticipanteOpcion>(`${PIAR}/${piarId}/opciones/participantes`),
    enabled,
  })
}

/** Al pasar sobre una fila: la ficha abre sin esperar. */
export function usePrefetchPiar() {
  const queryClient = useQueryClient()
  return (piarId: number) => queryClient.prefetchQuery({ ...piarQueryOptions(piarId), staleTime: 30_000 })
}
