"use no memo"

import { useState } from "react"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import {
  useOpcionesConvivencia,
  type Opcion,
} from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { abreviarPersona } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"
import {
  CITACIONES_FILTROS_VACIOS,
  COMPROMISOS_FILTROS_VACIOS,
  type CitacionRow,
  type CitacionesFiltros,
  type CompromisosFiltros,
} from "@/features/gestion-estudiantil/citaciones/api/types"

/** Opciones de un catálogo cuyo filtro viaja por código (`ESTADO`), no por pk. */
function porCodigo(opciones: ReturnType<typeof useCatalogo>): Opcion[] {
  return opciones.map((o) => ({ value: o.codigo, label: o.label }))
}

const porPk = (opciones: ReturnType<typeof useCatalogo>): Opcion[] =>
  opciones.map((o) => ({ value: o.value, label: o.label }))

/** Quién atiende: no hay endpoint de candidatos para el filtro, así que salen de lo que trae el listado. */
export function atiendenDelListado(rows: CitacionRow[] | undefined): Opcion[] {
  const unicos = new Map<number, string>()
  for (const r of rows ?? []) unicos.set(r.fk_tfuncionario_atiende, abreviarPersona(r.atiende_nombre))
  return [...unicos.entries()].map(([id, label]) => ({ value: String(id), label }))
}

/** Búsqueda, filtros aplicados y borrador del panel de Citaciones; la jornada depende de la sede (cascada). */
export function useCitacionesFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<CitacionesFiltros>(CITACIONES_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<CitacionesFiltros>(CITACIONES_FILTROS_VACIOS)

  const cascada = useOpcionesConvivencia(borrador.sede, "")
  const estados = useCatalogo("ESTADO_CITACION")
  const motivos = useCatalogo("MOTIVO_CITACION")

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    onSearchChange: (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    applyFilters: (next: CitacionesFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    onClearAll: () => {
      setSearch("")
      setFiltros(CITACIONES_FILTROS_VACIOS)
      setBorrador(CITACIONES_FILTROS_VACIOS)
      goToPage(0)
    },
    onDraftChange: setBorrador,
    opciones: {
      sedes: cascada.sedeOpciones,
      jornadas: cascada.jornadaOpciones,
      estados: porCodigo(estados),
      motivos: porPk(motivos),
    },
  }
}

/** Ídem para Compromisos. */
export function useCompromisosFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<CompromisosFiltros>(COMPROMISOS_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<CompromisosFiltros>(COMPROMISOS_FILTROS_VACIOS)

  const cascada = useOpcionesConvivencia(borrador.sede, "")
  const tipos = useCatalogo("TIPO_COMPROMISO")
  const estados = useCatalogo("ESTADO_COMPROMISO")

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    onSearchChange: (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    applyFilters: (next: CompromisosFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    onClearAll: () => {
      setSearch("")
      setFiltros(COMPROMISOS_FILTROS_VACIOS)
      setBorrador(COMPROMISOS_FILTROS_VACIOS)
      goToPage(0)
    },
    onDraftChange: setBorrador,
    opciones: {
      sedes: cascada.sedeOpciones,
      jornadas: cascada.jornadaOpciones,
      tipos: porPk(tipos),
      estados: porCodigo(estados),
    },
  }
}
