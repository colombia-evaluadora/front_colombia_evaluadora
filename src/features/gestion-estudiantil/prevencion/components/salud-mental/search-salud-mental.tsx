import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import {
  SALUD_MENTAL_FILTROS_VACIOS,
  type SaludMentalFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export interface OpcionesFiltrosSaludMental {
  sedes: Opcion[]
  jornadas: Opcion[]
  severidades: Opcion[]
  estados: Opcion[]
}

interface Props extends SearchFiltrosProps<SaludMentalFiltros> {
  opciones: OpcionesFiltrosSaludMental
}

/** Buscador de Salud mental (G.8.SAL.1-2): estudiante y el panel con Sede, Jornada, Severidad y Estado. */
export function SearchSaludMental(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<SaludMentalFiltros>({
    ...props,
    vacios: SALUD_MENTAL_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("severidad", "severidad", opciones.severidades),
      optionTerm("estado", "estado", opciones.estados),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="prevencion-salud-mental-search" placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <Combo
          id="prevencion-salud-mental-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id="prevencion-salud-mental-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todos" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
        <Combo
          id="prevencion-salud-mental-severidad"
          label="Severidad"
          value={draft.severidad}
          options={opciones.severidades}
          onChange={(severidad) => setDraft({ ...draft, severidad })}
        />
        <Combo
          id="prevencion-salud-mental-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
