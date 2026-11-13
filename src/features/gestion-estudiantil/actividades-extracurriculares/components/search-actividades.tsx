import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import {
  ACTIVIDADES_FILTROS_VACIOS,
  type ActividadesFiltros,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

export interface OpcionesFiltrosActividades {
  sedes: Opcion[]
  jornadas: Opcion[]
  tipos: Opcion[]
  responsables: Opcion[]
  estados: Opcion[]
}

interface Props extends SearchFiltrosProps<ActividadesFiltros> {
  opciones: OpcionesFiltrosActividades
}

/** Buscador del listado (G.5.ACT.LIS): por nombre, con Sede, Jornada, Tipo, Responsable y Estado en el panel. */
export function SearchActividades(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<ActividadesFiltros>({
    ...props,
    vacios: ACTIVIDADES_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("tipo", "tipo", opciones.tipos),
      optionTerm("responsable", "responsable", opciones.responsables),
      optionTerm("estado", "estado", opciones.estados),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="actividades-search" placeholder="Buscar por nombre" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <Combo
          id="actividades-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "", responsable: "" })}
        />
        <Combo
          id="actividades-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todos" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada, responsable: "" })}
        />
        <Combo
          id="actividades-tipo"
          label="Tipo"
          value={draft.tipo}
          options={opciones.tipos}
          onChange={(tipo) => setDraft({ ...draft, tipo })}
        />
        <Combo
          id="actividades-responsable"
          label="Responsable"
          value={draft.responsable}
          options={opciones.responsables}
          disabled={!draft.sede || !draft.jornada}
          placeholder={draft.sede && draft.jornada ? "Todos" : "Elija sede y jornada primero"}
          onChange={(responsable) => setDraft({ ...draft, responsable })}
        />
        <Combo
          id="actividades-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
