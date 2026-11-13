import { optionsTerm, optionTerm } from "@/components/search/query-syntax"
import { Checkbox } from "@/components/ui/checkbox"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import {
  CARACTERIZACIONES_FILTROS_VACIOS,
  type CaracterizacionesFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export interface OpcionesFiltrosCaracterizaciones {
  sedes: Opcion[]
  jornadas: Opcion[]
  grupos: Opcion[]
  estados: Opcion[]
}

interface Props extends SearchFiltrosProps<CaracterizacionesFiltros> {
  opciones: OpcionesFiltrosCaracterizaciones
}

/** Buscador de Caracterización (G.8.CAR.1-2): estudiante (nombre o documento) y el panel con Sede, Jornada, Grado/Grupo y Estado. */
export function SearchCaracterizaciones(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<CaracterizacionesFiltros>({
    ...props,
    vacios: CARACTERIZACIONES_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("grupo", "grupo", opciones.grupos),
      optionsTerm("estado", "estado", opciones.estados),
    ],
  })
  const { draft, setDraft } = s
  const alternarEstado = (estado: string, marcado: boolean) =>
    setDraft({ ...draft, estado: marcado ? [...draft.estado, estado] : draft.estado.filter((e) => e !== estado) })

  return (
    <BarraBusquedaFiltros
      id="prevencion-caracterizaciones-search"
      placeholder="Buscar por estudiante (nombre o documento)"
      estado={s}
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <Combo
          id="prevencion-caracterizaciones-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "", grupo: "" })}
        />
        <Combo
          id="prevencion-caracterizaciones-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todos" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada, grupo: "" })}
        />
        <Combo
          id="prevencion-caracterizaciones-grupo"
          label="Grado/Grupo"
          value={draft.grupo}
          options={opciones.grupos}
          onChange={(grupo) => setDraft({ ...draft, grupo })}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Estado</legend>
          {opciones.estados.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.estado.includes(o.value)}
                onCheckedChange={(marcado) => alternarEstado(o.value, marcado)}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      </div>
    </BarraBusquedaFiltros>
  )
}
