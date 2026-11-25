import { useState } from "react"

import { useTablePagination } from "@/hooks/use-table-pagination"

import { ordenServidor } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { ORDEN_SESIONES } from "@/features/gestion-estudiantil/convivencia/components/comite/columns-sesiones"
import { useComiteQuery, usePeriodosComiteQuery, useSesionesQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-comite-query"
import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { periodoPorDefecto, SESIONES_FILTROS_VACIOS, type SesionesFiltros } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** Período elegido (por defecto, el abierto), su Comité y las sesiones paginadas con filtro por tipo (G.2.COM.SES.1). */
export function useComiteTab(periodo: number | undefined) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const periodos = usePeriodosComiteQuery()
  const lista = periodos.data ?? []
  const actual = lista.find((p) => p.fk_periodo === periodo) ?? periodoPorDefecto(lista)

  const comite = useComiteQuery(actual?.fk_periodo ?? null)
  const fkComite = comite.data?.fk_comite ?? null

  const tipos = useCatalogo("TIPO_SESION_COMITE")
  const [search, setSearchTexto] = useState("")
  const [filtros, setFiltros] = useState<SesionesFiltros>(SESIONES_FILTROS_VACIOS)

  const sesiones = useSesionesQuery({
    comite: fkComite,
    filters: { FK_TLV_TIPO: filtros.tipo ? Number(filtros.tipo) : null, ...(search.trim() && { SEARCH: search.trim() }) },
    pageIndex,
    pageSize,
    orden: ordenServidor(sorting, ORDEN_SESIONES),
  })

  return {
    periodos,
    lista,
    actual,
    comite,
    fkComite,
    tipos,
    search,
    setSearch: (v: string) => {
      setSearchTexto(v)
      goToPage(0)
    },
    filtros,
    aplicarFiltros: (f: SesionesFiltros) => {
      setFiltros(f)
      goToPage(0)
    },
    limpiar: () => {
      setSearchTexto("")
      setFiltros(SESIONES_FILTROS_VACIOS)
      goToPage(0)
    },
    hayFiltros: Boolean(search.trim()) || Boolean(filtros.tipo),
    sesiones,
    pagina: { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting },
  }
}
