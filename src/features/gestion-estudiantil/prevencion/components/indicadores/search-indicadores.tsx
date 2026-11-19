import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import {
  INDICADORES_FILTROS_VACIOS,
  type IndicadoresFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export interface OpcionesFiltrosIndicadores {
  periodosAcademicos: Opcion[]
  periodos: Opcion[]
  sedes: Opcion[]
  jornadas: Opcion[]
  agrupaciones: Opcion[]
  motivos: Opcion[]
}

interface Props extends SearchFiltrosProps<IndicadoresFiltros> {
  opciones: OpcionesFiltrosIndicadores
}

/**
 * Filtros de Indicadores (G.8.IND.1-2): Período Académico, Período de Evaluación, Sede, Jornada, Agrupar por y
 * Motivo de retiro. No hay búsqueda por texto: el cuadro solo escribe y lee los filtros.
 */
export function SearchIndicadores(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<IndicadoresFiltros>({
    ...props,
    vacios: INDICADORES_FILTROS_VACIOS,
    terms: [
      optionTerm("periodoacademico", "periodoAcademico", opciones.periodosAcademicos),
      optionTerm("periodo", "periodo", opciones.periodos),
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("agrupar", "agrupar", opciones.agrupaciones),
      optionTerm("motivo", "motivoRetiro", opciones.motivos),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="prevencion-indicadores-search" placeholder="Filtrar indicadores" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="prevencion-indicadores-periodo-academico"
          label="Período Académico"
          todos="Vigente"
          value={draft.periodoAcademico}
          options={opciones.periodosAcademicos}
          onChange={(periodoAcademico) => setDraft({ ...draft, periodoAcademico, periodo: "" })}
        />
        <Combo
          id="prevencion-indicadores-periodo"
          label="Período de Evaluación"
          todos="Último consolidado"
          value={draft.periodo}
          options={opciones.periodos}
          onChange={(periodo) => setDraft({ ...draft, periodo })}
        />
        <Combo
          id="prevencion-indicadores-agrupar"
          label="Agrupar por"
          todos={false}
          value={draft.agrupar}
          options={opciones.agrupaciones}
          onChange={(agrupar) => setDraft({ ...draft, agrupar: agrupar || INDICADORES_FILTROS_VACIOS.agrupar })}
        />
        <Combo
          id="prevencion-indicadores-sede"
          label="Sede"
          todos="Todas"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id="prevencion-indicadores-jornada"
          label="Jornada"
          todos="Todas"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todas" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
        <Combo
          id="prevencion-indicadores-motivo"
          label="Motivo de retiro"
          value={draft.motivoRetiro}
          options={opciones.motivos}
          onChange={(motivoRetiro) => setDraft({ ...draft, motivoRetiro })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
