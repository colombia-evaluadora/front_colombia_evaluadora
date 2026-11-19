import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import { useSearchFiltros } from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"

interface FiltrosMatriculados {
  grado: string
}

const VACIOS: FiltrosMatriculados = { grado: "" }
const sinCambios = () => {}

interface Props {
  search: string
  grado: string
  grados: Opcion[]
  onChange: (cambio: { grado?: string; search?: string }) => void
}

/** Buscador de los matriculados al agregar beneficiarios (G.8.EST.8): estudiante por nombre o documento y filtro Grado. */
export function SearchMatriculados({ search, grado, grados, onChange }: Props) {
  const filtros = { grado }
  const s = useSearchFiltros<FiltrosMatriculados>({
    search,
    onSearchChange: (v) => onChange({ search: v }),
    filters: filtros,
    applyFilters: (f) => onChange({ grado: f.grado }),
    onClearAll: () => onChange({ grado: "", search: "" }),
    onDraftChange: sinCambios,
    vacios: VACIOS,
    terms: [optionTerm("grado", "grado", grados)],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="estrategia-matriculados-search" placeholder="Buscar matriculados por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4">
        <Combo
          id="estrategia-matriculados-grado"
          label="Grado"
          value={draft.grado}
          options={grados}
          onChange={(g) => setDraft({ ...draft, grado: g })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
