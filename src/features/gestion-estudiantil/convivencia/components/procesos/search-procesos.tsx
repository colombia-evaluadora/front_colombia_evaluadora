import { DatePicker } from "@/components/date-picker"
import { Field, FieldLabel } from "@/components/ui/field"
import { optionTerm, textTerm } from "@/components/search/query-syntax"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { PROCESOS_FILTROS_VACIOS, type ProcesosFiltros } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"

export interface OpcionesFiltrosProcesos {
  sedes: Opcion[]
  jornadas: Opcion[]
  estados: Opcion[]
  instancias: Opcion[]
  responsables: Opcion[]
}

export interface SearchProcesosProps extends SearchFiltrosProps<ProcesosFiltros> {
  opciones: OpcionesFiltrosProcesos
}

/** `dd/mm/aaaa` escrito en el buscador → `yyyy-MM-dd`; otra cosa, sin filtro todavía. */
function fechaEscrita(texto: string): string | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined
}

/** Buscador del listado de procesos (G.2.PRD.LIS.2): texto libre y el panel de filtros. */
export function SearchProcesos(props: SearchProcesosProps) {
  const { opciones } = props
  const s = useSearchFiltros<ProcesosFiltros>({
    ...props,
    vacios: PROCESOS_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("estado", "estado", opciones.estados),
      optionTerm("responsable", "responsable", opciones.responsables),
      optionTerm("instancia", "instancia", opciones.instancias),
      textTerm("desde", "desde", { format: formatFecha, parse: fechaEscrita }),
      textTerm("hasta", "hasta", { format: formatFecha, parse: fechaEscrita }),
    ],
  })
  const { draft, setDraft } = s
  const sinSede = !draft.sede

  return (
    <BarraBusquedaFiltros id="procesos-search" placeholder="Buscar por estudiante o número de proceso" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="procesos-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id="procesos-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={sinSede}
          placeholder={sinSede ? "Elija una sede primero" : "Todos"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
        <Combo
          id="procesos-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
        <Combo
          id="procesos-responsable"
          label="Responsable"
          value={draft.responsable}
          options={opciones.responsables}
          onChange={(responsable) => setDraft({ ...draft, responsable })}
        />
        <Combo
          id="procesos-instancia"
          label="Instancia que decide"
          value={draft.instancia}
          options={opciones.instancias}
          onChange={(instancia) => setDraft({ ...draft, instancia })}
        />
        <div className="hidden md:block" />
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="procesos-desde">Desde</FieldLabel>
          <DatePicker
            id="procesos-desde"
            value={parseDateValue(draft.desde)}
            onChange={(d) => setDraft({ ...draft, desde: formatDateValue(d) })}
          />
        </Field>
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="procesos-hasta">Hasta</FieldLabel>
          <DatePicker
            id="procesos-hasta"
            value={parseDateValue(draft.hasta)}
            minDate={draft.desde ? parseDateValue(draft.desde) : undefined}
            onChange={(d) => setDraft({ ...draft, hasta: formatDateValue(d) })}
          />
        </Field>
      </div>
    </BarraBusquedaFiltros>
  )
}
