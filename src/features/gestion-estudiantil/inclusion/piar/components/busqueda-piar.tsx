import { useCallback, useState } from "react"

import { optionTerm } from "@/components/search/query-syntax"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useOpcionesGrupos } from "@/features/gestion-estudiantil/commons/api/use-opciones-grupos"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useSearchFiltros } from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { FILTROS_VACIOS, type PiarFiltros } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { piarKeys } from "@/features/gestion-estudiantil/inclusion/piar/api/query-keys"

interface Props {
  search: string
  filtros: PiarFiltros
  onSearch: (v: string) => void
  onFiltros: (f: PiarFiltros) => void
  grados: Opcion[]
}

/** G.4.PIA.LIS.2: contiene las palabras y panel de filtros; las opciones se piden para lo que se está eligiendo. */
export function BusquedaPiar({ search, filtros, onSearch, onFiltros, grados }: Props) {
  // Borrador de la sede elegida: la jornada depende de ella (el borrador vive en el hook común).
  const [sedeBorrador, setSedeBorrador] = useState(filtros.sede)
  const opciones = useOpcionesGrupos(piarKeys.all, sedeBorrador, "")
  const estados = useCatalogo("ESTADO_PIAR")

  const onDraftChange = useCallback((d: PiarFiltros) => setSedeBorrador(d.sede), [])
  const s = useSearchFiltros<PiarFiltros>({
    search,
    onSearchChange: onSearch,
    filters: filtros,
    applyFilters: onFiltros,
    onClearAll: () => {
      onSearch("")
      onFiltros(FILTROS_VACIOS)
    },
    onDraftChange,
    vacios: FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedeOpciones),
      optionTerm("jornada", "jornada", opciones.jornadaOpciones),
      optionTerm("grado", "grado", grados),
      optionTerm("estado", "estado", estados),
    ],
  })
  const { draft, setDraft } = s
  const sinSede = !draft.sede

  return (
    <BarraBusquedaFiltros id="piar-search" placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-3">
        <Combo
          id="piar-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedeOpciones}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })}
        />
        <Combo
          id="piar-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadaOpciones}
          disabled={sinSede}
          placeholder={sinSede ? "Elija una sede primero" : "Todos"}
          onChange={(jornada) => setDraft({ ...draft, jornada })}
        />
        <Combo
          id="piar-estado"
          label="Estado"
          value={draft.estado}
          options={estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
        <Combo
          id="piar-grado"
          label="Grado"
          value={draft.grado}
          options={grados}
          onChange={(grado) => setDraft({ ...draft, grado })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
