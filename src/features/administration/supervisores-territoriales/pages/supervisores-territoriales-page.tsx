"use no memo"

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CheckIcon, ControlPointIcon, SpinnerIcon, XIcon, FunnelXIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { toPageCount } from "@/lib/pagination"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { SearchSuperadministradores } from "@/features/administration/superadministradores/components/search-superadministradores"

import { useEstadoSupervisor } from "@/features/administration/supervisores-territoriales/api/mutations/supervisor-mutations"
import { useSupervisoresQuery } from "@/features/administration/supervisores-territoriales/api/query/use-supervisores-query"
import {
  documentoTexto,
  establecimientosTexto,
  type SupervisorTerritorial,
} from "@/features/administration/supervisores-territoriales/api/types/supervisor"
import { createSupervisoresColumns } from "@/features/administration/supervisores-territoriales/components/columns-supervisores"
import {
  useSupervisoresFilters,
  type SupervisoresFilters,
} from "@/features/administration/supervisores-territoriales/hooks/use-supervisores-filters"

/** El `NoticeProvider` va afuera: `useNotify` lee el contexto de sus ancestros. */
export function SupervisoresTerritorialesPage() {
  return (
    <NoticeProvider>
      <SupervisoresTerritorialesPageContent />
    </NoticeProvider>
  )
}

const normalizar = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

/** Texto libre contra nombre, documento, correo y dependencia. */
function coincide(s: SupervisorTerritorial, { q, estado }: SupervisoresFilters) {
  if (estado && s.activo !== (estado === "activo")) return false
  const texto = normalizar(q.trim())
  if (!texto) return true
  return [s.nombre, documentoTexto(s), s.numeroDocumento ?? "", s.correo, s.dependencia ?? ""].some((v) =>
    normalizar(v).includes(texto),
  )
}

function valorOrdenable(s: SupervisorTerritorial, columna: string) {
  if (columna === "documento") return documentoTexto(s)
  if (columna === "correo") return s.correo
  if (columna === "dependencia") return s.dependencia ?? ""
  // "Todos" va después de cualquier cantidad.
  if (columna === "establecimientos") return s.todosEstablecimientos ? "~" : establecimientosTexto(s).padStart(6, "0")
  if (columna === "activo") return s.activo ? "0" : "1"
  return s.nombre
}

function SupervisoresTerritorialesPageContent() {
  const { notify } = useNotify()
  const navigate = useNavigate()
  // Administrador territorial y, de respaldo, el Superadministrador: acceso y guardado, sin Eliminar (V329.1).
  const permisos = useMenuPermission("SUPERVISORES_TERRITORIALES")
  const { filters, applyFilters, clearAllFilters, activeFilterCount } = useSupervisoresFilters()
  const paginacion = useTablePagination()
  const { data: lista = [], isPending, isError, error, refetch } = useSupervisoresQuery()

  const filtrados = lista.filter((s) => coincide(s, filters))
  const [orden] = paginacion.sorting
  const ordenados = orden
    ? [...filtrados].sort((a, b) => {
        const r = valorOrdenable(a, orden.id).localeCompare(valorOrdenable(b, orden.id), "es", { numeric: true })
        return orden.desc ? -r : r
      })
    : filtrados
  const pageCount = toPageCount(ordenados.length, paginacion.pageSize)
  const pageIndex = Math.min(paginacion.pageIndex, Math.max(pageCount - 1, 0))
  const pagina = ordenados.slice(pageIndex * paginacion.pageSize, (pageIndex + 1) * paginacion.pageSize)

  const [aInactivar, setAInactivar] = useState<SupervisorTerritorial | null>(null)
  const [pendiente, setPendiente] = useState<number | null>(null)

  const estado = useEstadoSupervisor({
    mutationConfig: {
      onSuccess: (s) =>
        notify(s.activo ? SUCCESS_MESSAGES.supervisorTerritorial.activated : SUCCESS_MESSAGES.supervisorTerritorial.deactivated),
      onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
      onSettled: () => {
        setPendiente(null)
        setAInactivar(null)
      },
    },
  })

  function cambiarEstado(s: SupervisorTerritorial, activo: boolean) {
    setPendiente(s.pkSupervisor)
    estado.mutate({ id: s.pkSupervisor, activo })
  }

  const columns = createSupervisoresColumns({
    puedeEditar: permisos.puedeEditar,
    pendiente,
    onVer: (s) => navigate({ to: paths.app.supervisorTerritorialDetalle.getHref(s.pkSupervisor) }),
    onModificar: (s) => navigate({ to: paths.app.supervisorTerritorialModificar.getHref(s.pkSupervisor) }),
    // Activar va directo; inactivar corta el acceso de alguien: se confirma.
    onEstado: (s) => (s.activo ? setAInactivar(s) : cambiarEstado(s, true)),
  })

  const { table } = useDataTable({
    columns,
    data: pagina,
    pageCount,
    getRowId: (row) => String(row.pkSupervisor),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "supervisores-territoriales-column-visibility",
  })

  const nuevo = () => navigate({ to: paths.app.supervisorTerritorialNuevo.getHref() })
  const sinRegistros = !isPending && !isError && lista.length === 0

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Usuarios de la entidad territorial y los establecimientos que tienen a cargo.">
          Supervisores territoriales
        </TableScreenTitle>
        <TableScreenToolbar>
          <SearchSuperadministradores
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
          />
          {permisos.puedeCrear && (
            <TableScreenActions>
              <Button color="primary" size="sm" onClick={nuevo}>
                <ControlPointIcon data-icon="inline-start" />
                Nuevo Supervisor territorial
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
          emptyMessage={
            sinRegistros ? (
              // Estado vacío de la Sección 7.2.
              <span className="flex flex-col items-center gap-3">
                No hay Supervisores territoriales.
                {permisos.puedeCrear && (
                  <Button size="sm" color="primary" onClick={nuevo}>
                    <ControlPointIcon data-icon="inline-start" />
                    Nuevo Supervisor territorial
                  </Button>
                )}
              </span>
            ) : (
              <span className="flex flex-col items-center gap-3">
                No hay Supervisores territoriales que coincidan con la búsqueda y los filtros aplicados.
                <Button size="sm" variant="outline" color="neutral" onClick={clearAllFilters}>
                  <FunnelXIcon data-icon="inline-start" />
                  Limpiar filtros
                </Button>
              </span>
            )
          }
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

      <AlertDialog open={aInactivar != null} onOpenChange={(open) => !open && !estado.isPending && setAInactivar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inactivar a {aInactivar?.nombre}</AlertDialogTitle>
            <AlertDialogDescription>
              Perderá el acceso a la plataforma y se cerrarán sus sesiones abiertas. Puede activarlo de nuevo cuando
              quiera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              color="destructive"
              disabled={estado.isPending}
              aria-busy={estado.isPending}
              onClick={() => aInactivar && cambiarEstado(aInactivar, false)}
            >
              {estado.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Inactivar
            </AlertDialogAction>
            <AlertDialogCancel variant="fill" color="neutral" disabled={estado.isPending}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableScreen>
  )
}
