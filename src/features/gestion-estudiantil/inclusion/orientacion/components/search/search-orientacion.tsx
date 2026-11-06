import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useOpcionesConvivencia } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { FILTROS_VACIOS, type OrientacionFiltros } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"

interface Props {
  search: string
  filtros: OrientacionFiltros
  onSearch: (v: string) => void
  onFiltros: (f: OrientacionFiltros) => void
}

/** G.4.ORI.LIS.4: palabras, Sede, Jornada, Motivo, Estado (remisiones) y Origen (atenciones). */
export function SearchOrientacion({ search, filtros, onSearch, onFiltros }: Props) {
  const [draft, setDraft] = useState(FILTROS_VACIOS)
  const [open, setOpen] = useState(false)
  const opciones = useOpcionesConvivencia(draft.sede, draft.jornada)
  const motivos = useCatalogo("MOTIVO_ORIENTACION")
  const estados = useCatalogo("ESTADO_REMISION_ORIENTACION")
  const origenes = useCatalogo("ORIGEN_ATENCION_ORIENTACION")

  useEffect(() => {
    if (open) setDraft(filtros)
  }, [open, filtros])

  const syntax: QuerySyntax<OrientacionFiltros & { search: string }> = {
    empty: { ...FILTROS_VACIOS, search: "" },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionTerm("sede", "sede", opciones.sedeOpciones),
      optionTerm("jornada", "jornada", opciones.jornadaOpciones),
      optionTerm("motivo", "motivo", motivos),
      optionTerm("estado", "estado", estados),
      optionTerm("origen", "origen", origenes),
    ],
  }
  const { search: queryText, setSearch: setQueryText } = useQuerySearch({
    syntax,
    filters: { ...filtros, search },
    applyFilters: ({ search: s, ...f }) => {
      onSearch(s)
      onFiltros(f)
    },
  })
  const badgeCount = Object.values(filtros).filter(Boolean).length

  return (
    <SearchQueryBar
      id="orientacion-search"
      label={null}
      placeholder="Buscar por estudiante"
      value={queryText}
      onValueChange={setQueryText}
      onClearAll={() => {
        onSearch("")
        onFiltros(FILTROS_VACIOS)
        setDraft(FILTROS_VACIOS)
        setOpen(false)
      }}
      onClearFilters={() => {
        setDraft(FILTROS_VACIOS)
        onFiltros(FILTROS_VACIOS)
      }}
      activeFilterCount={badgeCount + (search ? 1 : 0)}
      badgeCount={badgeCount}
      open={open}
      onOpenChange={setOpen}
      onApply={() => {
        onFiltros(draft)
        setOpen(false)
      }}
      size="lg"
      className="sm:w-full max-w-xl"
    >
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-3">
        <Combo id="ori-sede" label="Sede" value={draft.sede} options={opciones.sedeOpciones} onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })} />
        <Combo id="ori-jornada" label="Jornada" value={draft.jornada} options={opciones.jornadaOpciones} disabled={!draft.sede} placeholder={draft.sede ? "Todos" : "Elegí Sede primero"} onChange={(jornada) => setDraft({ ...draft, jornada })} />
        <Combo id="ori-motivo" label="Motivo" value={draft.motivo} options={motivos} onChange={(motivo) => setDraft({ ...draft, motivo })} />
        <Combo id="ori-estado" label="Estado (remisiones)" value={draft.estado} options={estados} onChange={(estado) => setDraft({ ...draft, estado })} />
        <Combo id="ori-origen" label="Origen (atenciones)" value={draft.origen} options={origenes} onChange={(origen) => setDraft({ ...draft, origen })} />
      </div>
    </SearchQueryBar>
  )
}
