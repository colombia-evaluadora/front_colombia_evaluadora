"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import {
  toActividadesFilters,
  useActividadesQuery,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import type { ActividadRow } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { buildColumnsActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/columns-actividades"
import type { AccionActividad } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/menu-acciones-actividad"
import { useActividadesFiltros } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-actividades-filtros"
import { useNavegacionActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-navegacion-actividades"

/** Sede y Jornada van ocultas de entrada; «Columnas visibles» las ofrece. */
const COLUMNAS_OCULTAS = { sede: false, jornada: false }

/** Consulta, tabla y acciones del listado de actividades (§6.1). */
export function useActividadesLista() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useActividadesFiltros(goToPage)
  const { irActividad, irEditar } = useNavegacionActividades()
  const [estadoDe, setEstadoDe] = useState<ActividadRow | null>(null)

  // El período no se manda: la cascada solo conoce períodos de evaluación y el listado ya ordena lo más reciente primero.
  const filters = useMemo(() => toActividadesFilters(f.search, f.filtros), [f.search, f.filtros])
  const query = useActividadesQuery({ filters, pageIndex, pageSize })

  const onAccion = useCallback(
    (fila: ActividadRow, accion: AccionActividad) => {
      if (accion === "ver") irActividad(fila.id)
      else if (accion === "modificar") irEditar(fila.id)
      else if (accion === "estado") setEstadoDe(fila)
    },
    [irActividad, irEditar],
  )
  const columns = useMemo(() => buildColumnsActividades({ onAccion }), [onAccion])

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
    columnVisibilityStorageKey: "actividades-extracurriculares-column-visibility",
    initialColumnVisibility: COLUMNAS_OCULTAS,
  })

  return { f, query, table, pageIndex, pageSize, goToPage, setPageSize, estadoDe, cerrarEstado: () => setEstadoDe(null) }
}
