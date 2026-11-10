import { DatePicker } from "@/components/date-picker"
import { Field, FieldLabel } from "@/components/ui/field"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import type { ProcesosFiltros } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { useSearchProcesos } from "@/features/gestion-estudiantil/convivencia/hooks/use-search-procesos"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"

export interface OpcionesFiltrosProcesos {
  sedes: Opcion[]
  jornadas: Opcion[]
  estados: Opcion[]
  instancias: Opcion[]
  responsables: Opcion[]
}

export interface SearchProcesosProps {
  search: string
  onSearchChange: (value: string) => void
  filters: ProcesosFiltros
  applyFilters: (values: ProcesosFiltros) => void
  onClearAll: () => void
  /** El panel pide las opciones del borrador (la jornada depende de la sede elegida). */
  onDraftChange: (draft: ProcesosFiltros) => void
  opciones: OpcionesFiltrosProcesos
}

/** Buscador del listado de procesos (G.2.PRD.LIS.2): texto libre y el panel de filtros. */
export function SearchProcesos(props: SearchProcesosProps) {
  const {
    open,
    setOpen,
    draft,
    setDraft,
    queryText,
    setQueryText,
    badgeCount,
    activeFilterCount,
    handleApply,
    handleClearFilters,
    handleClearAll,
  } = useSearchProcesos(props)
  const { opciones } = props

  const sinSede = !draft.sede

  return (
    <SearchQueryBar
      id="procesos-search"
      label={null}
      placeholder="Buscar por estudiante o número de proceso"
      value={queryText}
      onValueChange={setQueryText}
      onClearAll={handleClearAll}
      onClearFilters={handleClearFilters}
      activeFilterCount={activeFilterCount}
      badgeCount={badgeCount}
      open={open}
      onOpenChange={setOpen}
      onApply={handleApply}
      size="lg"
      className="sm:w-full max-w-xl"
    >
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
          placeholder={sinSede ? "Elegí Sede primero" : "Todos"}
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
    </SearchQueryBar>
  )
}
