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

import { useDeleteFestivo } from "@/features/administration/festivos/api/mutations/delete-festivo"
import { useEstadoFestivo } from "@/features/administration/festivos/api/mutations/estado-festivo"
import { useFestivosQuery } from "@/features/administration/festivos/api/query/use-festivos-query"
import { TIPO_FECHA_LABELS, type Festivo } from "@/features/administration/festivos/api/types"
import { createFestivosColumns } from "@/features/administration/festivos/components/columns-festivos"
import { DialogSaveFestivo } from "@/features/administration/festivos/components/dialog-save-festivo"
import { SearchFestivos } from "@/features/administration/festivos/components/search-festivos"
import {
  useFestivosFilters,
  type FestivosFilters,
} from "@/features/administration/festivos/hooks/use-festivos-filters"

/** El `NoticeProvider` va afuera: `useNotify` lee el contexto de sus ancestros. */
export function FestivosPage() {
  return (
    <NoticeProvider>
      <FestivosPageContent />
    </NoticeProvider>
  )
}

const normalizar = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

function coincide(festivo: Festivo, { q, tipo, estado }: FestivosFilters) {
  if (q && !normalizar(festivo.nombre).includes(normalizar(q.trim()))) return false
  if (tipo && festivo.tipoFecha !== tipo) return false
  if (estado && festivo.habilitado !== (estado === "activo")) return false
  return true
}

/** Texto por el que se ordena cada columna; sin orden, el del back (por fecha). */
function valorOrdenable(festivo: Festivo, columna: string) {
  if (columna === "tipoFecha") return TIPO_FECHA_LABELS[festivo.tipoFecha]
  if (columna === "fechaAnioEnCurso") return festivo.fechaAnioEnCurso
  if (columna === "habilitado") return festivo.habilitado ? "0" : "1"
  return festivo.nombre
}

function FestivosPageContent() {
  const { notify } = useNotify()
  // Solo el Superadministrador tiene el menú (V337.5, Regla 33).
  const permisos = useMenuPermission("FESTIVOS")
  const { filters, applyFilters, clearAllFilters, activeFilterCount } = useFestivosFilters()
  const paginacion = useTablePagination()

  const { data: festivos = [], isPending, isError, error, refetch } = useFestivosQuery()

  const filtrados = festivos.filter((f) => coincide(f, filters))
  const [orden] = paginacion.sorting
  const ordenados = orden
    ? [...filtrados].sort((a, b) => {
        const r = valorOrdenable(a, orden.id).localeCompare(valorOrdenable(b, orden.id), "es", {
          numeric: true,
        })
        return orden.desc ? -r : r
      })
    : filtrados
  const pageCount = toPageCount(ordenados.length, paginacion.pageSize)
  // Si un filtro o un borrado achican la lista, la página no queda fuera de rango.
  const pageIndex = Math.min(paginacion.pageIndex, Math.max(pageCount - 1, 0))
  const pagina = ordenados.slice(
    pageIndex * paginacion.pageSize,
    (pageIndex + 1) * paginacion.pageSize,
  )

  const [formulario, setFormulario] = useState<{ festivo: Festivo | null } | null>(null)
  const [pendiente, setPendiente] = useState<number | null>(null)

  const onError = (err: unknown) => notify(getErrorMessage(err), { variant: "error" })
  const onSettled = () => setPendiente(null)
  const estado = useEstadoFestivo({
    mutationConfig: {
      onSuccess: (f) =>
        notify(f.habilitado ? SUCCESS_MESSAGES.festivo.activated : SUCCESS_MESSAGES.festivo.deactivated),
      onError,
      onSettled,
    },
  })
  const eliminar = useDeleteFestivo({ mutationConfig: { onSettled } })

  const columns = createFestivosColumns({
    puedeEditar: permisos.puedeEditar,
    puedeEliminar: permisos.puedeEliminar,
    pendiente,
    onModificar: (festivo) => setFormulario({ festivo }),
    onEstado: (festivo) => {
      setPendiente(festivo.pkFestivo)
      estado.mutate({ id: festivo.pkFestivo, habilitado: !festivo.habilitado })
    },
    onEliminar: async (festivo) => {
      setPendiente(festivo.pkFestivo)
      try {
        await eliminar.mutateAsync({ id: festivo.pkFestivo })
        notify(SUCCESS_MESSAGES.festivo.deleted)
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
    getRowId: (row) => String(row.pkFestivo),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "festivos-column-visibility",
  })

  const emptyMessage =
    festivos.length === 0 ? (
      "Aún no hay festivos. Use Nuevo festivo para agregar el primero."
    ) : (
      <span className="flex flex-col items-center gap-3">
        No hay festivos que coincidan con la búsqueda y los filtros aplicados.
        <Button size="sm" variant="outline" color="neutral" onClick={clearAllFilters}>
          Limpiar filtros
        </Button>
      </span>
    )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Días inhábiles en el Calendario Académico de todos los establecimientos. Los cambios se aplican a los períodos que aún no han comenzado.">
          Festivos
        </TableScreenTitle>
        <TableScreenToolbar>
          <SearchFestivos
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
          />
          {permisos.puedeCrear && (
            <TableScreenActions>
              <Button color="primary" size="sm" onClick={() => setFormulario({ festivo: null })}>
                <ControlPointIcon data-icon="inline-start" />
                Nuevo festivo
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
          totalCount={filtrados.length}
          pageSize={paginacion.pageSize}
          onPageSizeChange={paginacion.setPageSize}
        />
      </TableScreenBody>

      <DialogSaveFestivo
        open={formulario != null}
        onOpenChange={(open) => !open && setFormulario(null)}
        festivo={formulario?.festivo ?? null}
      />
    </TableScreen>
  )
}
