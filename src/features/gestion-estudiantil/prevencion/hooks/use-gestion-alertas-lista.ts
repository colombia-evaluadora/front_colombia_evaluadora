"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"
import {
  RESPONSABLE_SIN,
  toGestionAlertasFilters,
  useGestionAlertasQuery,
  useOpcionesGestionAlertasQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-gestion-alertas-query"
import { useAccesoPrevencionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import {
  GESTION_ALERTAS_FILTROS_VACIOS,
  type GestionAlertaRow,
  type GestionAlertasFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import type { AccionGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/acciones-gestion"
import { buildColumnsGestionAlertas } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/columns-gestion-alertas"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"

/**
 * Consulta, filtros, «Ver todas» y tabla de la pestaña Gestión de alertas (§9.11). Sin «Ver todas» el backend
 * devuelve las del usuario como Responsable y las Sin responsable de su sede y jornada (Responsable = yo).
 */
export function useGestionAlertasLista(onAccion: (fila: GestionAlertaRow, accion: AccionGestion) => void) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { establecimientoId, sinSedes } = useAmbitoPrevencion("")
  const acceso = useAccesoPrevencionQuery(establecimientoId).data
  const opcionesQ = useOpcionesGestionAlertasQuery(establecimientoId)

  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<GestionAlertasFiltros>(GESTION_ALERTAS_FILTROS_VACIOS)
  // `null` = aún no se tocó: vale lo que diga el backend (el Administrador abre en Ver todas).
  const [verTodasElegido, setVerTodasElegido] = useState<boolean | null>(null)
  const verTodas = verTodasElegido ?? acceso?.gestion_alertas_ver_todas_defecto === true

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: GestionAlertasFiltros) => {
      setFiltros(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(GESTION_ALERTAS_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])
  const onVerTodas = useCallback(
    (v: boolean) => {
      setVerTodasElegido(v)
      goToPage(0)
    },
    [goToPage],
  )

  const o = opcionesQ.data
  const opciones = useMemo(
    () => ({
      estados: (o?.estados ?? []).map((e) => ({ value: e.valor, label: e.nombre })),
      umbrales: (o?.umbrales ?? []).map((u) => ({ value: u.valor, label: u.nombre })),
      grupos: (o?.grupos ?? []).map((g) => ({ value: String(g.fk_tgrupo), label: g.grado_grupo })),
      responsables: [
        ...(o?.responsables.sin_responsable ? [{ value: RESPONSABLE_SIN, label: "Sin responsable" }] : []),
        ...(o?.responsables.funcionarios ?? []).map((r) => ({ value: String(r.id), label: abreviarPersona(r.nombre) })),
      ],
    }),
    [o],
  )

  const filters = useMemo(
    () => (establecimientoId == null ? null : toGestionAlertasFilters(establecimientoId, verTodas, search, filtros)),
    [establecimientoId, verTodas, search, filtros],
  )
  const query = useGestionAlertasQuery({ filters, pageIndex, pageSize })
  const columns = useMemo(() => buildColumnsGestionAlertas(onAccion), [onAccion])

  const { table } = useDataTable({
    columns,
    data: query.data?.rows ?? [],
    pageCount: query.data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "prevencion-gestion-alertas-column-visibility",
  })

  return {
    query,
    table,
    filters,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    sinEstablecimiento: sinSedes,
    onSearchChange,
    applyFilters,
    onClearAll,
    opciones,
    verTodas,
    onVerTodas,
  }
}
