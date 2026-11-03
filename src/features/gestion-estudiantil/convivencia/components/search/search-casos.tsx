import { useEffect, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import { FILTROS_VACIOS, type ConvivenciaFiltros } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { Opcion } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"

export interface OpcionesFiltros {
  sedes: Opcion[]
  jornadas: Opcion[]
  tipos: Opcion[]
  estados: Opcion[]
  gestores: Opcion[]
}

interface SearchCasosProps {
  search: string
  onSearchChange: (value: string) => void
  filters: ConvivenciaFiltros
  applyFilters: (values: ConvivenciaFiltros) => void
  onClearAll: () => void
  /** El panel pide las opciones del borrador (la jornada depende de la sede elegida). */
  onDraftChange: (draft: ConvivenciaFiltros) => void
  opciones: OpcionesFiltros
}

type QueryFilters = ConvivenciaFiltros & { search: string }

const SIUCE_OPCIONES: Opcion[] = [{ value: "si", label: "Sí" }]

/** Buscador del listado de casos (G.2.CAS.LIS.2): texto libre y el panel de filtros. */
export function SearchCasos({
  search,
  onSearchChange,
  filters,
  applyFilters,
  onClearAll,
  onDraftChange,
  opciones,
}: SearchCasosProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraftState] = useState(filters)

  function setDraft(next: ConvivenciaFiltros) {
    setDraftState(next)
    onDraftChange(next)
  }

  useEffect(() => {
    if (open) {
      setDraftState(filters)
      onDraftChange(filters)
    }
    // Al abrir, el borrador arranca de lo aplicado.
  }, [open, filters, onDraftChange])

  const badgeCount = Object.values(filters).filter(Boolean).length
  const activeFilterCount = badgeCount + (search ? 1 : 0)

  function handleApply() {
    applyFilters(draft)
    setOpen(false)
  }

  function handleClearFilters() {
    setDraft(FILTROS_VACIOS)
    applyFilters(FILTROS_VACIOS)
  }

  function handleClearAll() {
    onClearAll()
    setDraft(FILTROS_VACIOS)
    setOpen(false)
  }

  const syntax: QuerySyntax<QueryFilters> = {
    empty: { ...FILTROS_VACIOS, search: "" },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("tipo", "tipo", opciones.tipos),
      optionTerm("estado", "estado", opciones.estados),
      optionTerm("gestor", "gestor", opciones.gestores),
      optionTerm("siuce", "pendienteSiuce", SIUCE_OPCIONES),
    ],
  }

  const { search: queryText, setSearch: setQueryText } = useQuerySearch({
    syntax,
    filters: { ...filters, search },
    applyFilters: (next) => {
      const { search: nextSearch, ...nextFilters } = next
      onSearchChange(nextSearch)
      applyFilters(nextFilters)
    },
  })

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
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-3">
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
