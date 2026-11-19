import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"

/** Sede, Jornada y Estado son comunes a las dos vistas; Responsable solo existe en los acompañamientos. */
export interface FiltrosListadoAcomp {
  sede: string
  jornada: string
  estado: string
  responsable?: string
}

export interface OpcionesFiltrosAcomp {
  sedes: Opcion[]
  jornadas: Opcion[]
  estados: Opcion[]
  /** Sin esta lista no se ofrece el filtro Responsable (Reportes recibidos). */
  responsables?: Opcion[]
}

interface Props<F extends FiltrosListadoAcomp> extends SearchFiltrosProps<F> {
  id: string
  vacios: F
  opciones: OpcionesFiltrosAcomp
}

/** Buscador de Embarazo, Consumo y Reportes recibidos: estudiante y el panel con Sede, Jornada, Responsable y Estado. */
export function SearchAcompanamientos<F extends FiltrosListadoAcomp>(props: Props<F>) {
  const { id, opciones, vacios } = props
  const s = useSearchFiltros<F>({
    ...props,
    vacios,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      ...(opciones.responsables ? [optionTerm("responsable", "responsable", opciones.responsables)] : []),
      optionTerm("estado", "estado", opciones.estados),
    ] as Parameters<typeof useSearchFiltros<F>>[0]["terms"],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id={`${id}-search`} placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <Combo
          id={`${id}-sede`}
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id={`${id}-jornada`}
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todos" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
        {opciones.responsables && (
          <Combo
            id={`${id}-responsable`}
            label="Responsable"
            value={draft.responsable ?? ""}
            options={opciones.responsables}
            onChange={(responsable) => setDraft({ ...draft, responsable })}
          />
        )}
        <Combo
          id={`${id}-estado`}
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
