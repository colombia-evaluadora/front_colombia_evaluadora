"use no memo"

import { useState } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { toPageCount } from "@/lib/pagination"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"

import { useDeleteAreaOficial } from "@/features/administration/areas-oficiales/api/mutations/delete-area-oficial"
import { useEstadoAreaOficial } from "@/features/administration/areas-oficiales/api/mutations/estado-area-oficial"
import { useAreasOficialesQuery } from "@/features/administration/areas-oficiales/api/query/use-areas-oficiales-query"
import type { AreaOficial } from "@/features/administration/areas-oficiales/api/types/area-oficial"
import {
  createAreasOficialesColumns,
  nivelesTexto,
} from "@/features/administration/areas-oficiales/components/columns-areas-oficiales"
import { DialogDetalleAreaOficial } from "@/features/administration/areas-oficiales/components/dialog-detalle-area-oficial"
import { DialogSaveAreaOficial } from "@/features/administration/areas-oficiales/components/dialog-save-area-oficial"
import { SearchAreasOficiales } from "@/features/administration/areas-oficiales/components/search-areas-oficiales"
import {
  useAreasOficialesFilters,
  type AreasOficialesFilters,
} from "@/features/administration/areas-oficiales/hooks/use-areas-oficiales-filters"

/** El `NoticeProvider` va afuera: `useNotify` lee el contexto de sus ancestros. */
export function AreasOficialesPage() {
  return (
    <NoticeProvider>
      <AreasOficialesPageContent />
    </NoticeProvider>
  )
}

const normalizar = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

function coincide(area: AreaOficial, { q, nivel, estado }: AreasOficialesFilters) {
  if (q && !normalizar(area.nombre).includes(normalizar(q.trim()))) return false
  if (nivel && !area.niveles.some((n) => String(n.pkNivel) === nivel)) return false
  if (estado && area.habilitada !== (estado === "activa")) return false
  return true
}

/** Texto por el que se ordena cada columna. */
function valorOrdenable(area: AreaOficial, columna: string) {
  if (columna === "niveles") return nivelesTexto(area)
  if (columna === "habilitada") return area.habilitada ? "0" : "1"
  return area.nombre
}

function AreasOficialesPageContent() {
  const { notify } = useNotify()
  // Solo el Superadministrador tiene el menú (V317): el resto no llega acá.
  const permisos = useMenuPermission("AREAS_OFICIALES")
  const { filters, applyFilters, clearAllFilters, activeFilterCount } = useAreasOficialesFilters()
  const paginacion = useTablePagination()

  const { data: areas = [], isPending, isError, error, refetch } = useAreasOficialesQuery()
  const { data: nivelesCatalogo = [] } = useTeachingLevelsQuery()
  const niveles = nivelesCatalogo.map((n) => ({ value: n.id, label: n.nombre }))

  // El endpoint trae el catálogo completo: filtro, orden y página se resuelven acá.
  const filtradas = areas.filter((area) => coincide(area, filters))
  const [orden] = paginacion.sorting
  const ordenadas = orden
    ? [...filtradas].sort((a, b) => {
        const r = valorOrdenable(a, orden.id).localeCompare(valorOrdenable(b, orden.id), "es", {
          numeric: true,
        })
        return orden.desc ? -r : r
      })
    : filtradas
  const pageCount = toPageCount(ordenadas.length, paginacion.pageSize)
  // Si un filtro o un borrado achican la lista, la página no queda fuera de rango.
  const pageIndex = Math.min(paginacion.pageIndex, Math.max(pageCount - 1, 0))
  const pagina = ordenadas.slice(
    pageIndex * paginacion.pageSize,
    (pageIndex + 1) * paginacion.pageSize,
  )

  const [detalle, setDetalle] = useState<AreaOficial | null>(null)
  const [formulario, setFormulario] = useState<{ area: AreaOficial | null } | null>(null)
  const [pendiente, setPendiente] = useState<number | null>(null)

  const onError = (err: unknown) => notify(getErrorMessage(err), { variant: "error" })
  const onSettled = () => setPendiente(null)
  const estado = useEstadoAreaOficial({
    mutationConfig: {
      onSuccess: (area) =>
        notify(
          area.habilitada
            ? SUCCESS_MESSAGES.areaOficial.activated
            : SUCCESS_MESSAGES.areaOficial.deactivated,
        ),
      onError,
      onSettled,
    },
  })
  const eliminar = useDeleteAreaOficial({ mutationConfig: { onSettled } })

  const columns = createAreasOficialesColumns({
    puedeEditar: permisos.puedeEditar,
    puedeEliminar: permisos.puedeEliminar,
    pendiente,
    onVer: setDetalle,
    onModificar: (area) => setFormulario({ area }),
    onEstado: (area) => {
      setPendiente(area.pkAreaOficial)
      estado.mutate({ id: area.pkAreaOficial, habilitada: !area.habilitada })
    },
    onEliminar: async (area) => {
      setPendiente(area.pkAreaOficial)
      try {
        await eliminar.mutateAsync({ id: area.pkAreaOficial })
        notify(SUCCESS_MESSAGES.areaOficial.deleted)
        return true
      } catch (err) {
        onError(err)
        return false
      }
    },
  })

  const { table } = useDataTable({
    columns,
    data: pagina,
    pageCount,
    getRowId: (row) => String(row.pkAreaOficial),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "areas-oficiales-column-visibility",
  })

  const emptyMessage =
    areas.length === 0 ? (
      "Aún no hay áreas oficiales. Use Nueva área oficial para agregar la primera."
    ) : (
      <span className="flex flex-col items-center gap-3">
        No hay áreas oficiales que coincidan con la búsqueda y los filtros aplicados.
        <Button size="sm" variant="outline" color="neutral" onClick={clearAllFilters}>
          Limpiar filtros
        </Button>
      </span>
    )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Catálogo global de áreas que usan los Planes de Estudio y los Referentes.">
          Áreas oficiales
        </TableScreenTitle>
        <TableScreenToolbar>
          <SearchAreasOficiales
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            niveles={niveles}
          />
          {permisos.puedeCrear && (
            <TableScreenActions>
              <Button color="primary" size="sm" onClick={() => setFormulario({ area: null })}>
                <ControlPointIcon data-icon="inline-start" />
                Nueva área oficial
              </Button>
            </TableScreenActions>
          )}
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage={emptyMessage}
        />
        <Pagination
          viewOptions={<DataTableViewOptions table={table} />}
          pageIndex={pageIndex}
          pageCount={pageCount}
          canPrev={pageIndex > 0}
          canNext={pageIndex < pageCount - 1}
          onPageChange={paginacion.goToPage}
          totalCount={filtradas.length}
          pageSize={paginacion.pageSize}
          onPageSizeChange={paginacion.setPageSize}
        />
      </TableScreenBody>

      <DialogDetalleAreaOficial area={detalle} onClose={() => setDetalle(null)} />
      <DialogSaveAreaOficial
        open={formulario != null}
        onOpenChange={(open) => !open && setFormulario(null)}
        area={formulario?.area ?? null}
        niveles={niveles}
      />
    </TableScreen>
  )
}
