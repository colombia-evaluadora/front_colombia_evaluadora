import { Checkbox } from "@/components/ui/checkbox"
import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import {
  RECONOCIMIENTOS_FILTROS_VACIOS,
  type ReconocimientosFiltros,
} from "@/features/gestion-estudiantil/reconocimientos/api/types"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"

export interface OpcionesFiltrosReconocimientos {
  sedes: Opcion[]
  jornadas: Opcion[]
  tipos: Opcion[]
  periodos: Opcion[]
}

interface Props extends SearchFiltrosProps<ReconocimientosFiltros> {
  opciones: OpcionesFiltrosReconocimientos
}

const ANULADOS: Opcion[] = [{ value: "true", label: "Incluidos" }]

/**
 * Buscador del listado de reconocimientos (G.6.LIS.1-2): el texto libre es «Contiene las palabras»
 * (estudiante, motivo) y el panel suma Sede, Jornada, Tipo, Período de Evaluación e «Incluir anulados».
 */
export function SearchReconocimientos(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<ReconocimientosFiltros>({
    ...props,
    vacios: RECONOCIMIENTOS_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("tipo", "tipo", opciones.tipos),
      optionTerm("periodo", "periodo", opciones.periodos),
      optionTerm("anulados", "anulados", ANULADOS),
    ],
  })
  const { draft, setDraft } = s
  const sinSede = !draft.sede
  const sinJornada = !draft.jornada

  return (
    <BarraBusquedaFiltros id="reconocimientos-search" placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="reconocimientos-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "", periodo: "" })}
        />
        <Combo
          id="reconocimientos-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={sinSede}
          placeholder={sinSede ? "Elija una sede primero" : "Todos"}
          onChange={(jornada) => setDraft({ ...draft, jornada, periodo: "" })}
        />
        <Combo
          id="reconocimientos-tipo"
          label="Tipo"
          value={draft.tipo}
          options={opciones.tipos}
          onChange={(tipo) => setDraft({ ...draft, tipo })}
        />
        <Combo
          id="reconocimientos-periodo"
          label="Período de Evaluación"
          value={draft.periodo}
          options={opciones.periodos}
          disabled={sinSede || sinJornada}
          placeholder={sinSede || sinJornada ? "Elija sede y jornada primero" : "Todos"}
          onChange={(periodo) => setDraft({ ...draft, periodo })}
        />
        <label className="flex items-center gap-2 self-center text-sm md:col-span-2">
          <Checkbox
            checked={draft.anulados === "true"}
            onCheckedChange={(c) => setDraft({ ...draft, anulados: c === true ? "true" : "" })}
          />
          Incluir anulados
        </label>
      </div>
    </BarraBusquedaFiltros>
  )
}
