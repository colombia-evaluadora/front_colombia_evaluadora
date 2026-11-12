import { optionTerm } from "@/components/search/query-syntax"

import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import {
  OBSERVACIONES_FILTROS_VACIOS,
  type ObservacionesFiltros,
} from "@/features/gestion-estudiantil/observaciones/api/types"

export interface OpcionesFiltrosObservaciones {
  sedes: Opcion[]
  jornadas: Opcion[]
  grupos: Opcion[]
  periodos: Opcion[]
  destinatarios: Opcion[]
}

interface Props extends SearchFiltrosProps<ObservacionesFiltros> {
  opciones: OpcionesFiltrosObservaciones
}

/**
 * Buscador del listado (G.7.LIS.1): el texto libre busca por estudiante o por título, y el panel suma
 * Sede, Jornada, Grado/Grupo, Período de Evaluación y «Dirigida a».
 */
export function SearchObservaciones(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<ObservacionesFiltros>({
    ...props,
    vacios: OBSERVACIONES_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("grupo", "grupo", opciones.grupos),
      optionTerm("periodo", "periodo", opciones.periodos),
      optionTerm("dirigida", "destinatario", opciones.destinatarios),
    ],
  })
  const { draft, setDraft } = s
  const sinSede = !draft.sede
  const sinJornada = !draft.jornada
  const pideSedeJornada = sinSede || sinJornada ? "Elija sede y jornada primero" : "Todos"

  return (
    <BarraBusquedaFiltros id="observaciones-search" placeholder="Buscar por estudiante o título" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="observaciones-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "", grupo: "", periodo: "" })}
        />
        <Combo
          id="observaciones-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={sinSede}
          placeholder={sinSede ? "Elija una sede primero" : "Todos"}
          onChange={(jornada) => setDraft({ ...draft, jornada, grupo: "", periodo: "" })}
        />
        <Combo
          id="observaciones-grupo"
          label="Grado/Grupo"
          value={draft.grupo}
          options={opciones.grupos}
          disabled={sinSede || sinJornada}
          placeholder={pideSedeJornada}
          onChange={(grupo) => setDraft({ ...draft, grupo })}
        />
        <Combo
          id="observaciones-periodo"
          label="Período de Evaluación"
          value={draft.periodo}
          options={opciones.periodos}
          disabled={sinSede || sinJornada}
          placeholder={pideSedeJornada}
          onChange={(periodo) => setDraft({ ...draft, periodo })}
        />
        <Combo
          id="observaciones-dirigida"
          label="Dirigida a"
          value={draft.destinatario}
          options={opciones.destinatarios}
          onChange={(destinatario) => setDraft({ ...draft, destinatario })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
