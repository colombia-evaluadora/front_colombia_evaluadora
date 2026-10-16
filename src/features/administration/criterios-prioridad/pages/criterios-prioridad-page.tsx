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

import { useDeleteCriterioPrioridad } from "@/features/administration/criterios-prioridad/api/mutations/delete-criterio-prioridad"
import { useEstadoCriterioPrioridad } from "@/features/administration/criterios-prioridad/api/mutations/estado-criterio-prioridad"
import { useCriteriosPrioridadQuery } from "@/features/administration/criterios-prioridad/api/query/use-criterios-prioridad-query"
import {
  bloqueCampoTexto,
  type CriterioPrioridad,
} from "@/features/administration/criterios-prioridad/api/types/criterio-prioridad"
import {
  createCriteriosPrioridadColumns,
  reglaTexto,
} from "@/features/administration/criterios-prioridad/components/columns-criterios-prioridad"
import {
  DialogCriterioPrioridad,
  type ModoCriterio,
} from "@/features/administration/criterios-prioridad/components/dialog-criterio-prioridad"

/** El `NoticeProvider` va afuera: `useNotify` lee el contexto de sus ancestros. */
export function CriteriosPrioridadPage() {
  return (
    <NoticeProvider>
      <CriteriosPrioridadPageContent />
    </NoticeProvider>
  )
}

/** Texto por el que se ordena cada columna. */
function valorOrdenable(criterio: CriterioPrioridad, columna: string) {
  if (columna === "campo") return bloqueCampoTexto(criterio.campo)
  if (columna === "regla") return reglaTexto(criterio)
  if (columna === "habilitado") return criterio.habilitado ? "0" : "1"
  return criterio.nombre
}

function CriteriosPrioridadPageContent() {
  const { notify } = useNotify()
  // Solo el Superadministrador tiene el menú (V321): el resto no llega acá.
  const permisos = useMenuPermission("CRITERIOS_PRIORIDAD")
  const paginacion = useTablePagination()
  const { data: criterios = [], isPending, isError, error, refetch } = useCriteriosPrioridadQuery()

  // Sin búsqueda ni filtros (Sección 5): orden y página se resuelven acá.
  const [orden] = paginacion.sorting
  const ordenados = orden
    ? [...criterios].sort((a, b) => {
        const r = valorOrdenable(a, orden.id).localeCompare(valorOrdenable(b, orden.id), "es", {
          numeric: true,
        })
        return orden.desc ? -r : r
      })
    : criterios
  const pageCount = toPageCount(ordenados.length, paginacion.pageSize)
  const pageIndex = Math.min(paginacion.pageIndex, Math.max(pageCount - 1, 0))
  const pagina = ordenados.slice(
    pageIndex * paginacion.pageSize,
    (pageIndex + 1) * paginacion.pageSize,
  )

  const [dialogo, setDialogo] = useState<{ modo: ModoCriterio; criterio: CriterioPrioridad | null } | null>(
    null,
  )
  const [pendiente, setPendiente] = useState<number | null>(null)

  const onError = (err: unknown) => notify(getErrorMessage(err), { variant: "error" })
  const onSettled = () => setPendiente(null)
  const estado = useEstadoCriterioPrioridad({
    mutationConfig: {
      onSuccess: (criterio) =>
        notify(
          criterio.habilitado
            ? SUCCESS_MESSAGES.criterioPrioridad.activated
            : SUCCESS_MESSAGES.criterioPrioridad.deactivated,
        ),
      onError,
      onSettled,
    },
  })
  const eliminar = useDeleteCriterioPrioridad({ mutationConfig: { onSettled } })

  const columns = createCriteriosPrioridadColumns({
    puedeEditar: permisos.puedeEditar,
    puedeEliminar: permisos.puedeEliminar,
    pendiente,
    onVer: (criterio) => setDialogo({ modo: "ver", criterio }),
    onModificar: (criterio) => setDialogo({ modo: "modificar", criterio }),
    onEstado: (criterio) => {
      setPendiente(criterio.pkCriterio)
      estado.mutate({ id: criterio.pkCriterio, habilitado: !criterio.habilitado })
    },
    onEliminar: async (criterio) => {
      setPendiente(criterio.pkCriterio)
      try {
        await eliminar.mutateAsync({ id: criterio.pkCriterio })
        notify(SUCCESS_MESSAGES.criterioPrioridad.deleted)
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
    getRowId: (row) => String(row.pkCriterio),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "criterios-prioridad-column-visibility",
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Criterios con que cada establecimiento ordena la admisión de aspirantes en Cobertura.">
          Criterios de prioridad
        </TableScreenTitle>
        {/* Sin buscador: la barra solo lleva la acción (y el aviso de la pantalla). */}
        <TableScreenToolbar className="py-3">
          <span />
          {permisos.puedeCrear && (
            <TableScreenActions>
              <Button color="primary" size="sm" onClick={() => setDialogo({ modo: "nuevo", criterio: null })}>
                <ControlPointIcon data-icon="inline-start" />
                Nuevo criterio
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
          emptyMessage="Aún no hay criterios de prioridad. Use Nuevo criterio para agregar el primero."
        />
        <Pagination
          viewOptions={<DataTableViewOptions table={table} />}
          pageIndex={pageIndex}
          pageCount={pageCount}
          canPrev={pageIndex > 0}
          canNext={pageIndex < pageCount - 1}
          onPageChange={paginacion.goToPage}
          totalCount={criterios.length}
          pageSize={paginacion.pageSize}
          onPageSizeChange={paginacion.setPageSize}
        />
      </TableScreenBody>

      <DialogCriterioPrioridad
        modo={dialogo?.modo ?? null}
        criterio={dialogo?.criterio ?? null}
        puedeEditar={permisos.puedeEditar}
        onClose={() => setDialogo(null)}
        onModificar={(criterio) => setDialogo({ modo: "modificar", criterio })}
      />
    </TableScreen>
  )
}
