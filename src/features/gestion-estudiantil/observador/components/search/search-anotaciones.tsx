import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import { FILTROS_VACIOS, type ObservadorFiltros } from "@/features/gestion-estudiantil/observador/api/types"
import type { Opcion } from "@/features/gestion-estudiantil/observador/api/use-opciones-observador"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"

export interface OpcionesFiltros {
  sedes: Opcion[]
  jornadas: Opcion[]
  grupos: Opcion[]
  periodos: Opcion[]
  tipos: Opcion[]
  situaciones: Opcion[]
  responsables: Opcion[]
}

interface SearchAnotacionesProps {
  search: string
  onSearchChange: (value: string) => void
  filters: ObservadorFiltros
  applyFilters: (values: ObservadorFiltros) => void
  onClearAll: () => void
  /** El panel pide las opciones del borrador (la jornada depende de la sede elegida). */
  onDraftChange: (draft: ObservadorFiltros) => void
  opciones: OpcionesFiltros
}

type QueryFilters = ObservadorFiltros & { search: string }

/** Buscador de la vista Observador (G.1.LIS.2): texto libre y el panel de filtros. */
export function SearchAnotaciones({
  search,
  onSearchChange,
  filters,
  applyFilters,
  onClearAll,
  onDraftChange,
  opciones,
}: SearchAnotacionesProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraftState] = useState(filters)

  function setDraft(next: ObservadorFiltros) {
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
      optionTerm("grupo", "grupo", opciones.grupos),
      optionTerm("periodo", "periodo", opciones.periodos),
      optionTerm("tipo", "tipo", opciones.tipos),
      optionTerm("situacion", "situacion", opciones.situaciones),
      optionTerm("responsable", "responsable", opciones.responsables),
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
  const sinJornada = !draft.jornada

  return (
    <SearchQueryBar
      id="observador-search"
      label={null}
      placeholder="Buscar por estudiante (nombre o documento) o código"
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
          id="observador-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          // Sede reencuadra jornada, grupo y período: lo de abajo puede no existir en la nueva.
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "", grupo: "", periodo: "" })}
        />
        <Combo
          id="observador-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={sinSede}
          placeholder={sinSede ? "Elegí Sede primero" : "Todos"}
          onChange={(jornada) => setDraft({ ...draft, jornada, grupo: "", periodo: "" })}
        />
        <Combo
          id="observador-grupo"
          label="Grado/Grupo"
          value={draft.grupo}
          options={opciones.grupos}
          disabled={sinJornada}
          placeholder={sinJornada ? "Elegí Jornada primero" : "Todos"}
          onChange={(grupo) => setDraft({ ...draft, grupo })}
        />
        <Combo
          id="observador-periodo"
          label="Período de Evaluación"
          value={draft.periodo}
          options={opciones.periodos}
          disabled={sinJornada}
          placeholder={sinJornada ? "Elegí Jornada primero" : "Todos"}
          onChange={(periodo) => setDraft({ ...draft, periodo })}
        />
        <Combo
          id="observador-tipo"
          label="Tipo"
          value={draft.tipo}
          options={opciones.tipos}
          onChange={(tipo) => setDraft({ ...draft, tipo })}
        />
        <Combo
          id="observador-situacion"
          label="Tipo de situación"
          value={draft.situacion}
          options={opciones.situaciones}
          onChange={(situacion) => setDraft({ ...draft, situacion })}
        />
        <Combo
          id="observador-responsable"
          label="Responsable de enseñanza"
          value={draft.responsable}
          options={opciones.responsables}
          onChange={(responsable) => setDraft({ ...draft, responsable })}
        />
      </div>
    </SearchQueryBar>
  )
}
