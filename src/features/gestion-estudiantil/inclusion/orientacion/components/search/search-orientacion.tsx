import { useCallback, useState } from "react"

import { optionTerm } from "@/components/search/query-syntax"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useOpcionesGrupos } from "@/features/gestion-estudiantil/commons/api/use-opciones-grupos"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useSearchFiltros } from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import { FILTROS_VACIOS, type OrientacionFiltros } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import { orientacionKeys } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query-keys"

interface Props {
  search: string
  filtros: OrientacionFiltros
  onSearch: (v: string) => void
  onFiltros: (f: OrientacionFiltros) => void
}

/** G.4.ORI.LIS.4: contiene las palabras, Sede, Jornada, Motivo, Estado (remisiones), Modalidad y Origen (atenciones). */
export function SearchOrientacion({ search, filtros, onSearch, onFiltros }: Props) {
  const [sedeBorrador, setSedeBorrador] = useState(filtros.sede)
  const [jornadaBorrador, setJornadaBorrador] = useState(filtros.jornada)
  const opciones = useOpcionesGrupos(orientacionKeys.all, sedeBorrador, jornadaBorrador)
  const motivos = useCatalogo("MOTIVO_ORIENTACION")
  const estados = useCatalogo("ESTADO_REMISION_ORIENTACION")
  const origenes = useCatalogo("ORIGEN_ATENCION_ORIENTACION")
  const modalidades = useCatalogo("MODALIDAD_ATENCION_ORIENTACION")

  const onDraftChange = useCallback((d: OrientacionFiltros) => {
    setSedeBorrador(d.sede)
    setJornadaBorrador(d.jornada)
  }, [])
  const s = useSearchFiltros<OrientacionFiltros>({
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
      optionTerm("motivo", "motivo", motivos),
      optionTerm("estado", "estado", estados),
      optionTerm("modalidad", "modalidad", modalidades),
      optionTerm("origen", "origen", origenes),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="orientacion-search" placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-3">
        <Combo id="ori-sede" label="Sede" value={draft.sede} options={opciones.sedeOpciones} onChange={(sede) => setDraft({ ...draft, sede, jornada: "" })} />
        <Combo id="ori-jornada" label="Jornada" value={draft.jornada} options={opciones.jornadaOpciones} disabled={!draft.sede} placeholder={draft.sede ? "Todos" : "Elija una sede primero"} onChange={(jornada) => setDraft({ ...draft, jornada })} />
        <Combo id="ori-motivo" label="Motivo" value={draft.motivo} options={motivos} onChange={(motivo) => setDraft({ ...draft, motivo })} />
        <Combo id="ori-estado" label="Estado (remisiones)" value={draft.estado} options={estados} onChange={(estado) => setDraft({ ...draft, estado })} />
        <Combo id="ori-modalidad" label="Modalidad (atenciones)" value={draft.modalidad} options={modalidades} onChange={(modalidad) => setDraft({ ...draft, modalidad })} />
        <Combo id="ori-origen" label="Origen (atenciones)" value={draft.origen} options={origenes} onChange={(origen) => setDraft({ ...draft, origen })} />
      </div>
    </BarraBusquedaFiltros>
  )
}
