import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import {
  ESTRATEGIAS_FILTROS_VACIOS,
  type EstrategiasFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export interface OpcionesFiltrosEstrategias {
  sedes: Opcion[]
  jornadas: Opcion[]
  tipos: Opcion[]
  estados: Opcion[]
}

interface Props extends SearchFiltrosProps<EstrategiasFiltros> {
  opciones: OpcionesFiltrosEstrategias
}

/** Buscador de Estrategias (G.8.EST.1-2): nombre o estudiante beneficiario y el panel con Sede, Jornada, Tipo y Estado. */
export function SearchEstrategias(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<EstrategiasFiltros>({
    ...props,
    vacios: ESTRATEGIAS_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("tipo", "tipo", opciones.tipos),
      optionTerm("estado", "estado", opciones.estados),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="prevencion-estrategias-search" placeholder="Buscar por estrategia o estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <Combo
          id="prevencion-estrategias-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id="prevencion-estrategias-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todos" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
        <Combo
          id="prevencion-estrategias-tipo"
          label="Tipo"
          value={draft.tipo}
          options={opciones.tipos}
          onChange={(tipo) => setDraft({ ...draft, tipo })}
        />
        <Combo
          id="prevencion-estrategias-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
