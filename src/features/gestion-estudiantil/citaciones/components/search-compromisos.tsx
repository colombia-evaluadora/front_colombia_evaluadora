import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import {
  COMPROMISOS_FILTROS_VACIOS,
  type CompromisosFiltros,
} from "@/features/gestion-estudiantil/citaciones/api/types"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"

export interface OpcionesFiltrosCompromisos {
  sedes: Opcion[]
  jornadas: Opcion[]
  tipos: Opcion[]
  estados: Opcion[]
}

interface Props extends SearchFiltrosProps<CompromisosFiltros> {
  opciones: OpcionesFiltrosCompromisos
}

/** Buscador del listado de compromisos (G.3.CMP.1): por estudiante, con Tipo y Estado (y Sede/Jornada). */
export function SearchCompromisos(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<CompromisosFiltros>({
    ...props,
    vacios: COMPROMISOS_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("tipo", "tipo", opciones.tipos),
      optionTerm("estado", "estado", opciones.estados),
    ],
  })
  const { draft, setDraft } = s
  const sinSede = !draft.sede

  return (
    <BarraBusquedaFiltros id="compromisos-search" placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="compromisos-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id="compromisos-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={sinSede}
          placeholder={sinSede ? "Elija una sede primero" : "Todos"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
        <div className="hidden md:block" />
        <Combo
          id="compromisos-tipo"
          label="Tipo"
          value={draft.tipo}
          options={opciones.tipos}
          onChange={(tipo) => setDraft({ ...draft, tipo })}
        />
        <Combo
          id="compromisos-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
