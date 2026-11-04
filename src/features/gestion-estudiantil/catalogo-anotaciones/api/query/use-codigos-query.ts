import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { catalogoKeys } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/query-keys"
import type { CatalogoFiltros, CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"

const id = (value: string) => (value ? Number(value) : null)

interface Params {
  establecimiento: number | null
  search: string
  filtros: CatalogoFiltros
  pageIndex: number
  pageSize: number
}

/** `POST /gestion-estudiantil/catalogo-anotaciones/query`: el catálogo es del establecimiento, sin sede ni jornada. */
export function useCodigosQuery({ establecimiento, search, filtros, pageIndex, pageSize }: Params) {
  const FILTERS = {
    SEARCH: search.trim() || null,
    FK_TLV_TIPO: id(filtros.tipo),
    FK_TLV_SITUACION: id(filtros.situacion),
    HABILITADO: filtros.estado ? filtros.estado === "activo" : null,
  }
  return useQuery({
    queryKey: catalogoKeys.lista({ establecimiento, FILTERS, pageIndex, pageSize }),
    queryFn: async () => {
      const rows = await evalCol.postRows<CodigoRow>("/gestion-estudiantil/catalogo-anotaciones/query", {
        FK_ESTABLECIMIENTO: establecimiento,
        FILTERS,
        PAGEINDEX: pageIndex,
        PAGESIZE: pageSize,
      })
      const totalCount = rows[0]?.total_count ?? 0
      return { rows, totalCount, pageCount: toPageCount(totalCount, pageSize) }
    },
    enabled: establecimiento != null,
    placeholderData: keepPreviousData,
  })
}
