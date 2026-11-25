import { optionTerm } from "@/components/search/query-syntax"

import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SESIONES_FILTROS_VACIOS, type SesionesFiltros } from "@/features/gestion-estudiantil/convivencia/utils/comite"
import { useSearchFiltros, type SearchFiltrosProps } from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"

interface Props extends SearchFiltrosProps<SesionesFiltros> {
  tipos: OpcionCatalogo[]
}

/** Buscador de sesiones del Comité (G.2.COM.SES.1): texto por fecha dd/mm/aaaa o tipo de sesión, y el filtro de Tipo de sesión. */
export function SearchSesiones(props: Props) {
  const { tipos } = props
  const s = useSearchFiltros<SesionesFiltros>({
    ...props,
    vacios: SESIONES_FILTROS_VACIOS,
    terms: [optionTerm("tipo", "tipo", tipos)],
  })
  const { draft, setDraft } = s
  return (
    <BarraBusquedaFiltros id="sesiones-search" placeholder="Buscar por fecha o tipo de sesión" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <ComboOpciones
          id="sesiones-tipo"
          label="Tipo de sesión"
          value={draft.tipo}
          options={tipos}
          onChange={(tipo) => setDraft({ ...draft, tipo })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
