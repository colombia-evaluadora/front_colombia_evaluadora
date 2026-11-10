import { Checkbox } from "@/components/ui/checkbox"
import { SearchQueryBar } from "@/components/search/search-query-bar"

import type { ConvivenciaFiltros } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { useSearchCasos } from "@/features/gestion-estudiantil/convivencia/hooks/use-search-casos"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"

export interface OpcionesFiltros {
  sedes: Opcion[]
  jornadas: Opcion[]
  tipos: Opcion[]
  estados: Opcion[]
  gestores: Opcion[]
}

export interface SearchCasosProps {
  search: string
  onSearchChange: (value: string) => void
  filters: ConvivenciaFiltros
  applyFilters: (values: ConvivenciaFiltros) => void
  onClearAll: () => void
  /** El panel pide las opciones del borrador (la jornada depende de la sede elegida). */
  onDraftChange: (draft: ConvivenciaFiltros) => void
  opciones: OpcionesFiltros
}

/** Buscador del listado de casos (G.2.CAS.LIS.2): texto libre y el panel de filtros. */
export function SearchCasos(props: SearchCasosProps) {
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
  } = useSearchCasos(props)
  const { opciones } = props

  const sinSede = !draft.sede

  return (
    <SearchQueryBar
      id="convivencia-search"
      label={null}
      placeholder="Buscar por estudiante o número de caso"
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
          placeholder={sinSede ? "Elegí Sede primero" : "Todos"}
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
        <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-3">
          <Checkbox
            checked={Boolean(draft.pendienteSiuce)}
            onCheckedChange={(c) => setDraft({ ...draft, pendienteSiuce: c ? "si" : "" })}
          />
          Con afectados pendientes de reporte al SIUCE
        </label>
      </div>
    </SearchQueryBar>
  )
}
