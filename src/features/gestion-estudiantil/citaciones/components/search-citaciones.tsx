import { DatePicker } from "@/components/date-picker"
import { Field, FieldLabel } from "@/components/ui/field"
import { optionTerm, textTerm } from "@/components/search/query-syntax"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { CITACIONES_FILTROS_VACIOS, type CitacionesFiltros } from "@/features/gestion-estudiantil/citaciones/api/types"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"

export interface OpcionesFiltrosCitaciones {
  sedes: Opcion[]
  jornadas: Opcion[]
  estados: Opcion[]
  motivos: Opcion[]
  atienden: Opcion[]
}

interface Props extends SearchFiltrosProps<CitacionesFiltros> {
  opciones: OpcionesFiltrosCitaciones
}

/** `dd/mm/aaaa` escrito en el buscador → `yyyy-MM-dd`; otra cosa, sin filtro todavía. */
function fechaEscrita(texto: string): string | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined
}

/** Buscador del listado de citaciones (G.3.CIT.2): estudiante o acudiente, y el panel de filtros. */
export function SearchCitaciones(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<CitacionesFiltros>({
    ...props,
    vacios: CITACIONES_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("estado", "estado", opciones.estados),
      optionTerm("motivo", "motivo", opciones.motivos),
      optionTerm("atiende", "atiende", opciones.atienden),
      textTerm("desde", "desde", { format: formatFecha, parse: fechaEscrita }),
      textTerm("hasta", "hasta", { format: formatFecha, parse: fechaEscrita }),
    ],
  })
  const { draft, setDraft } = s
  const sinSede = !draft.sede

  return (
    <BarraBusquedaFiltros id="citaciones-search" placeholder="Buscar por estudiante o acudiente" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="citaciones-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id="citaciones-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={sinSede}
          placeholder={sinSede ? "Elija una sede primero" : "Todos"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
        <Combo
          id="citaciones-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
        <Combo
          id="citaciones-motivo"
          label="Motivo"
          value={draft.motivo}
          options={opciones.motivos}
          onChange={(motivo) => setDraft({ ...draft, motivo })}
        />
        <Combo
          id="citaciones-atiende"
          label="Quién atiende"
          value={draft.atiende}
          options={opciones.atienden}
          onChange={(atiende) => setDraft({ ...draft, atiende })}
        />
        <div className="hidden md:block" />
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="citaciones-desde">Desde</FieldLabel>
          <DatePicker
            id="citaciones-desde"
            value={parseDateValue(draft.desde)}
            onChange={(d) => setDraft({ ...draft, desde: formatDateValue(d) })}
          />
        </Field>
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="citaciones-hasta">Hasta</FieldLabel>
          <DatePicker
            id="citaciones-hasta"
            value={parseDateValue(draft.hasta)}
            minDate={draft.desde ? parseDateValue(draft.desde) : undefined}
            onChange={(d) => setDraft({ ...draft, hasta: formatDateValue(d) })}
          />
        </Field>
      </div>
    </BarraBusquedaFiltros>
  )
}
