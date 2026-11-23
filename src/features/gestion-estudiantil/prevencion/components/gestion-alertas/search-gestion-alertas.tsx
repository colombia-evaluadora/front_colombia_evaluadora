import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import {
  GESTION_ALERTAS_FILTROS_VACIOS,
  type GestionAlertasFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export interface OpcionesFiltrosGestion {
  estados: Opcion[]
  umbrales: Opcion[]
  grupos: Opcion[]
  responsables: Opcion[]
}

interface Props extends SearchFiltrosProps<GestionAlertasFiltros> {
  opciones: OpcionesFiltrosGestion
}

/** Buscador de Gestión de alertas (G.8.GAL.4): estudiante y el panel con Estado, Umbral, Grado/Grupo y Responsable. */
export function SearchGestionAlertas(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<GestionAlertasFiltros>({
    ...props,
    vacios: GESTION_ALERTAS_FILTROS_VACIOS,
    terms: [
      optionTerm("estado", "estado", opciones.estados),
      optionTerm("umbral", "umbral", opciones.umbrales),
      optionTerm("grupo", "grupo", opciones.grupos),
      optionTerm("responsable", "responsable", opciones.responsables),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="prevencion-gestion-alertas-search" placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <Combo
          id="prevencion-gestion-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
        <Combo
          id="prevencion-gestion-umbral"
          label="Umbral"
          value={draft.umbral}
          options={opciones.umbrales}
          onChange={(umbral) => setDraft({ ...draft, umbral })}
        />
        <Combo
          id="prevencion-gestion-grupo"
          label="Grado/Grupo"
          value={draft.grupo}
          options={opciones.grupos}
          onChange={(grupo) => setDraft({ ...draft, grupo })}
        />
        <Combo
          id="prevencion-gestion-responsable"
          label="Responsable"
          value={draft.responsable}
          options={opciones.responsables}
          onChange={(responsable) => setDraft({ ...draft, responsable })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
