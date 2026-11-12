import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import {
  TABLERO_FILTROS_VACIOS,
  type TableroFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export interface OpcionesFiltrosTablero {
  sedes: Opcion[]
  jornadas: Opcion[]
  grupos: Opcion[]
  senales: Opcion[]
  niveles: Opcion[]
  periodos: Opcion[]
}

interface Props extends SearchFiltrosProps<TableroFiltros> {
  opciones: OpcionesFiltrosTablero
}

/**
 * Buscador del Tablero de alertas (G.8.TAB.1-2): el texto libre es «Contiene las palabras» (estudiante) y
 * el panel suma Período, Sede, Jornada, Grado/Grupo, Señal y Nivel de riesgo.
 */
export function SearchTablero(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<TableroFiltros>({
    ...props,
    vacios: TABLERO_FILTROS_VACIOS,
    terms: [
      optionTerm("periodo", "periodo", opciones.periodos),
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("grupo", "grupo", opciones.grupos),
      optionTerm("senal", "senal", opciones.senales),
      optionTerm("nivel", "nivel", opciones.niveles),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="prevencion-tablero-search" placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="prevencion-tablero-periodo"
          label="Período"
          value={draft.periodo}
          options={opciones.periodos}
          todos="Vigente"
          onChange={(periodo) => setDraft({ ...draft, periodo })}
        />
        <Combo
          id="prevencion-tablero-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "", grupo: "" })}
        />
        <Combo
          id="prevencion-tablero-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todos" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada, grupo: "" })}
        />
        <Combo
          id="prevencion-tablero-grupo"
          label="Grado/Grupo"
          value={draft.grupo}
          options={opciones.grupos}
          onChange={(grupo) => setDraft({ ...draft, grupo })}
        />
        <Combo
          id="prevencion-tablero-senal"
          label="Señal"
          value={draft.senal}
          options={opciones.senales}
          onChange={(senal) => setDraft({ ...draft, senal })}
        />
        <Combo
          id="prevencion-tablero-nivel"
          label="Nivel de riesgo"
          value={draft.nivel}
          options={opciones.niveles}
          onChange={(nivel) => setDraft({ ...draft, nivel })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
