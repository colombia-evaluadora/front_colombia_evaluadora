import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import {
  VALORACIONES_FILTROS_VACIOS,
  type ValoracionesFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export interface OpcionesFiltrosValoraciones {
  sedes: Opcion[]
  jornadas: Opcion[]
  niveles: Opcion[]
  estados: Opcion[]
  anuladas: Opcion[]
}

interface Props extends SearchFiltrosProps<ValoracionesFiltros> {
  opciones: OpcionesFiltrosValoraciones
}

/** Buscador de Valoraciones y planes (G.8.VAL.1-2): estudiante y el panel con Nivel, Estado del plan, Sede, Jornada y Anuladas. */
export function SearchValoraciones(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<ValoracionesFiltros>({
    ...props,
    vacios: VALORACIONES_FILTROS_VACIOS,
    terms: [
      optionTerm("nivel", "nivel", opciones.niveles),
      optionTerm("estado", "estado", opciones.estados),
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("anuladas", "anuladas", opciones.anuladas),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="prevencion-valoraciones-search" placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="prevencion-valoraciones-nivel"
          label="Nivel de riesgo"
          value={draft.nivel}
          options={opciones.niveles}
          onChange={(nivel) => setDraft({ ...draft, nivel })}
        />
        <Combo
          id="prevencion-valoraciones-estado"
          label="Estado del plan"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
        <Combo
          id="prevencion-valoraciones-anuladas"
          label="Anuladas"
          value={draft.anuladas}
          options={opciones.anuladas}
          todos="Ocultar"
          onChange={(anuladas) => setDraft({ ...draft, anuladas })}
        />
        <Combo
          id="prevencion-valoraciones-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id="prevencion-valoraciones-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todos" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
