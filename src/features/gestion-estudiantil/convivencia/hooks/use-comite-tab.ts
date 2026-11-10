import { useState } from "react"

import { useTablePagination } from "@/hooks/use-table-pagination"

import { useComiteQuery, usePeriodosComiteQuery, useSesionesQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-comite-query"
import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { periodoPorDefecto } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** Período elegido (por defecto, el abierto), su Comité y las sesiones paginadas con filtro por tipo (G.2.COM.SES.1). */
export function useComiteTab(periodo: number | undefined) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const periodos = usePeriodosComiteQuery()
  const lista = periodos.data ?? []
  const actual = lista.find((p) => p.fk_periodo === periodo) ?? periodoPorDefecto(lista)

  const comite = useComiteQuery(actual?.fk_periodo ?? null)
  const fkComite = comite.data?.fk_comite ?? null

  const tipos = useCatalogo("TIPO_SESION_COMITE")
  const [tipo, setTipo] = useState("")

  const sesiones = useSesionesQuery({
    comite: fkComite,
    filters: { FK_TLV_TIPO: tipo ? Number(tipo) : null },
    pageIndex,
    pageSize,
  })

  return {
    periodos,
    lista,
    actual,
    comite,
    fkComite,
    tipos,
    tipo,
    setTipo: (t: string) => {
      setTipo(t)
      goToPage(0)
    },
    sesiones,
    pagina: { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting },
  }
}
