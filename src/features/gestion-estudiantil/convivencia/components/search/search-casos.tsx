import { Checkbox } from "@/components/ui/checkbox"
import { MarcoOpciones } from "@/components/marco-opciones"
import { optionTerm } from "@/components/search/query-syntax"

import { FILTROS_VACIOS, type ConvivenciaFiltros } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"

export interface OpcionesFiltros {
  sedes: Opcion[]
  jornadas: Opcion[]
  tipos: Opcion[]
  estados: Opcion[]
  gestores: Opcion[]
}

export interface SearchCasosProps extends SearchFiltrosProps<ConvivenciaFiltros> {
  opciones: OpcionesFiltros
}

const SIUCE_OPCIONES: Opcion[] = [{ value: "si", label: "Sí" }]

/** Buscador del listado de casos (G.2.CAS.LIS.2): texto libre y el panel de filtros. */
export function SearchCasos(props: SearchCasosProps) {
  const { opciones } = props
  const s = useSearchFiltros<ConvivenciaFiltros>({
    ...props,
    vacios: FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("tipo", "tipo", opciones.tipos),
      optionTerm("estado", "estado", opciones.estados),
      optionTerm("gestor", "gestor", opciones.gestores),
      optionTerm("siuce", "pendienteSiuce", SIUCE_OPCIONES),
    ],
  })
  const { draft, setDraft } = s
  const sinSede = !draft.sede

  return (
    <BarraBusquedaFiltros id="convivencia-search" placeholder="Buscar por estudiante o número de caso" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="convivencia-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id="convivencia-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={sinSede}
          placeholder={sinSede ? "Elija una sede primero" : "Todos"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
        <Combo
          id="convivencia-tipo"
          label="Tipo"
          value={draft.tipo}
          options={opciones.tipos}
          onChange={(tipo) => setDraft({ ...draft, tipo })}
        />
        <Combo
          id="convivencia-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
        <Combo
          id="convivencia-gestor"
          label="Gestor"
          value={draft.gestor}
          options={opciones.gestores}
          onChange={(gestor) => setDraft({ ...draft, gestor })}
        />
        <MarcoOpciones id="casos-pendiente-siuce" className="sm:col-span-3">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={Boolean(draft.pendienteSiuce)}
              onCheckedChange={(c) => setDraft({ ...draft, pendienteSiuce: c ? "si" : "" })}
            />
            Con afectados pendientes de reporte al SIUCE
          </label>
        </MarcoOpciones>
      </div>
    </BarraBusquedaFiltros>
  )
}
