import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { procesosKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import type {
  ProcesoRow,
  ProcesosFiltros,
  ProcesosQueryFilters,
} from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import type { Opcion } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"

const BASE = "/gestion-estudiantil/convivencia/procesos"
const id = (value: string) => (value ? Number(value) : null)

export function toProcesosFilters(search: string, f: ProcesosFiltros): ProcesosQueryFilters {
  return {
    SEARCH: search.trim() || null,
    FK_SEDE: id(f.sede),
    FK_JORNADA: id(f.jornada),
    FK_ESTADO: id(f.estado),
    FK_RESPONSABLE: id(f.responsable),
    FK_INSTANCIA: id(f.instancia),
    FECHA_DESDE: f.desde || null,
    FECHA_HASTA: f.hasta || null,
  }
}

export interface ProcesosParams {
  filters: ProcesosQueryFilters
  pageIndex: number
  pageSize: number
}

/** `POST /procesos/query`: el alcance y los `puede_*` los calcula el backend. */
export function useProcesosQuery(params: ProcesosParams) {
  return useQuery({
    queryKey: procesosKeys.lista(params),
    queryFn: async () => {
      const rows = await evalCol.postRows<ProcesoRow>(`${BASE}/query`, {
        FILTERS: params.filters,
        PAGEINDEX: params.pageIndex,
        PAGESIZE: params.pageSize,
      })
      const totalCount = rows[0]?.total_count ?? 0
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    placeholderData: (prev) => prev,
  })
}

/** `GET /procesos/opciones/responsables-filtro`: responsables de los procesos visibles. */
export function useResponsablesFiltroQuery() {
  return useQuery({
    queryKey: procesosKeys.responsables(),
    queryFn: () =>
      evalCol
        .getRows<{ id: number; nombre: string }>(`${BASE}/opciones/responsables-filtro`)
        .then((r): Opcion[] => r.map((p) => ({ value: String(p.id), label: p.nombre }))),
    staleTime: 60_000,
  })
}
