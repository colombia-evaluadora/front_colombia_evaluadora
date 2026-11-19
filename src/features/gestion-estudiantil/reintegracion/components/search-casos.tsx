import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import { CASOS_FILTROS_VACIOS, type CasosFiltros } from "@/features/gestion-estudiantil/reintegracion/api/types"

export interface OpcionesFiltrosCasos {
  sedes: Opcion[]
  jornadas: Opcion[]
  estados: Opcion[]
  profesionales: Opcion[]
  origenes: Opcion[]
}

interface Props extends SearchFiltrosProps<CasosFiltros> {
  opciones: OpcionesFiltrosCasos
}

/** Buscador de la bandeja (G.9.BAN.1): «Contiene las palabras» y el panel con Sede, Jornada, Estado, Profesional y Origen. */
export function SearchCasos(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<CasosFiltros>({
    ...props,
    vacios: CASOS_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("estado", "estado", opciones.estados),
      optionTerm("profesional", "profesional", opciones.profesionales),
      optionTerm("origen", "origen", opciones.origenes),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="reintegracion-casos-search" placeholder="Contiene las palabras" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <Combo
          id="reintegracion-casos-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "", profesional: "" })}
        />
        <Combo
          id="reintegracion-casos-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todos" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada, profesional: "" })}
        />
        <Combo
          id="reintegracion-casos-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
        <Combo
          id="reintegracion-casos-profesional"
          label="Profesional de trabajo social"
          value={draft.profesional}
          options={opciones.profesionales}
          onChange={(profesional) => setDraft({ ...draft, profesional })}
        />
        <Combo
          id="reintegracion-casos-origen"
          label="Origen"
          value={draft.origen}
          options={opciones.origenes}
          onChange={(origen) => setDraft({ ...draft, origen })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
