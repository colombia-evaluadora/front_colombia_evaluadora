import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useOpcionesConvivencia } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { FILTROS_VACIOS, type PiarFiltros } from "@/features/gestion-estudiantil/inclusion/piar/api/types"

const CONDICIONES = [
  { value: "DISCAPACIDAD", label: "Discapacidad" },
  { value: "TALENTO", label: "Talento excepcional" },
  { value: "SIN_CONDICION", label: "Sin condición" },
]
const PENDIENTES = [
  { value: "SI", label: "Con seguimientos pendientes" },
  { value: "NO", label: "Sin seguimientos pendientes" },
]

interface Props {
  search: string
  filtros: PiarFiltros
  onSearch: (v: string) => void
  onFiltros: (f: PiarFiltros) => void
}

/** G.4.PIA.LIS.2: texto libre y panel de filtros; las opciones se piden para lo que se está eligiendo. */
export function BusquedaPiar({ search, filtros, onSearch, onFiltros }: Props) {
  const [draft, setDraft] = useState<PiarFiltros>(FILTROS_VACIOS)
  const [open, setOpen] = useState(false)
  const opciones = useOpcionesConvivencia(draft.sede, draft.jornada)
  const estados = useCatalogo("ESTADO_PIAR")

  useEffect(() => {
    if (open) setDraft(filtros)
  }, [open, filtros])

  type Q = PiarFiltros & { search: string }
  const syntax: QuerySyntax<Q> = {
    empty: { ...FILTROS_VACIOS, search: "" },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionTerm("sede", "sede", opciones.sedeOpciones),
      optionTerm("jornada", "jornada", opciones.jornadaOpciones),
      optionTerm("grupo", "grupo", opciones.grupoOpciones),
      optionTerm("estado", "estado", estados),
      optionTerm("condicion", "condicion", CONDICIONES),
      optionTerm("pendientes", "pendientes", PENDIENTES),
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
            id="piar-search"
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
              <Combo id="piar-sede" label="Sede" value={draft.sede} options={opciones.sedeOpciones} onChange={(sede) => setDraft({ ...draft, sede, jornada: "", grupo: "" })} />
              <Combo
                id="piar-jornada"
                label="Jornada"
                value={draft.jornada}
                options={opciones.jornadaOpciones}
                disabled={!draft.sede}
                placeholder={draft.sede ? "Todos" : "Elegí Sede primero"}
                onChange={(jornada) => setDraft({ ...draft, jornada, grupo: "" })}
              />
              <Combo
                id="piar-grupo"
                label="Grado/Grupo"
                value={draft.grupo}
                options={opciones.grupoOpciones}
                disabled={!draft.jornada}
                placeholder={draft.jornada ? "Todos" : "Elegí Jornada primero"}
                onChange={(grupo) => setDraft({ ...draft, grupo })}
              />
              <Combo id="piar-estado" label="Estado" value={draft.estado} options={estados} onChange={(estado) => setDraft({ ...draft, estado })} />
              <Combo id="piar-condicion" label="Condición" value={draft.condicion} options={CONDICIONES} onChange={(condicion) => setDraft({ ...draft, condicion })} />
              <Combo id="piar-pendientes" label="Seguimientos" value={draft.pendientes} options={PENDIENTES} onChange={(pendientes) => setDraft({ ...draft, pendientes })} />
            </div>
          </SearchQueryBar>
  )
}
