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
import { CheckIcon, ControlPointIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage, isConflictError } from "@/lib/api-client"
import { toPageCount } from "@/lib/pagination"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useEstadoSuperadministrador } from "@/features/administration/superadministradores/api/mutations/estado-superadministrador"
import { useSuperadministradoresQuery } from "@/features/administration/superadministradores/api/query/use-superadministradores-query"
import {
  documentoTexto,
  type Superadministrador,
} from "@/features/administration/superadministradores/api/types/superadministrador"
import { SearchSuperadministradores } from "@/features/administration/superadministradores/components/search-superadministradores"
import {
  useSuperadministradoresFilters,
  type SuperadministradoresFilters,
} from "@/features/administration/superadministradores/hooks/use-superadministradores-filters"
import { createSuperadministradoresColumns } from "@/features/administration/superadministradores/components/columns-superadministradores"
import {
  DialogSuperadministrador,
  type ModoSuperadministrador,
} from "@/features/administration/superadministradores/components/dialog-superadministrador"

/** El `NoticeProvider` va afuera: `useNotify` lee el contexto de sus ancestros. */
export function SuperadministradoresPage() {
  return (
    <NoticeProvider>
      <SuperadministradoresPageContent />
    </NoticeProvider>
  )
}

const normalizar = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

/** Texto libre contra nombre, documento («CC 123» o solo el número) y correo. */
function coincide(s: Superadministrador, { q, estado }: SuperadministradoresFilters) {
  if (estado && s.activo !== (estado === "activo")) return false
  const texto = normalizar(q.trim())
  if (!texto) return true
  return [s.nombre, documentoTexto(s), s.numeroDocumento ?? "", s.correo].some((v) =>
    normalizar(v).includes(texto),
  )
}

function valorOrdenable(s: Superadministrador, columna: string) {
  if (columna === "documento") return documentoTexto(s)
  if (columna === "correo") return s.correo
  if (columna === "activo") return s.activo ? "0" : "1"
  return s.nombre
}

function SuperadministradoresPageContent() {
  const { notify } = useNotify()
  // Solo el Superadministrador tiene el menú (V325): acceso y guardado, sin Eliminar.
  const permisos = useMenuPermission("SUPERADMINISTRADORES")
  const { filters, applyFilters, clearAllFilters, activeFilterCount } =
    useSuperadministradoresFilters()
  const paginacion = useTablePagination()
  const { data: lista = [], isPending, isError, error, refetch } = useSuperadministradoresQuery()

  const filtrados = lista.filter((s) => coincide(s, filters))
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
  const pageIndex = Math.min(paginacion.pageIndex, Math.max(pageCount - 1, 0))
  const pagina = ordenados.slice(
    pageIndex * paginacion.pageSize,
    (pageIndex + 1) * paginacion.pageSize,
  )

  const [dialogo, setDialogo] = useState<{
    modo: ModoSuperadministrador
    superadministrador: Superadministrador | null
  } | null>(null)
  const [aInactivar, setAInactivar] = useState<Superadministrador | null>(null)
  /** Mensaje del bloqueo «último activo» (409), con su botón Entendido. */
  const [bloqueo, setBloqueo] = useState<{ nombre: string; mensaje: string } | null>(null)
  const [pendiente, setPendiente] = useState<number | null>(null)

  const estado = useEstadoSuperadministrador({
    mutationConfig: {
      onSuccess: (s) =>
        notify(
          s.activo
            ? SUCCESS_MESSAGES.superadministrador.activated
            : SUCCESS_MESSAGES.superadministrador.deactivated,
        ),
      onSettled: () => {
        setPendiente(null)
        setAInactivar(null)
      },
    },
  })

  function cambiarEstado(s: Superadministrador, activo: boolean) {
    setPendiente(s.pkSuperadministrador)
    estado.mutate(
      { id: s.pkSuperadministrador, activo },
      {
        onError: (err) => {
          if (isConflictError(err)) setBloqueo({ nombre: s.nombre, mensaje: getErrorMessage(err) })
          else notify(getErrorMessage(err), { variant: "error" })
        },
      },
    )
  }

  const columns = createSuperadministradoresColumns({
    puedeEditar: permisos.puedeEditar,
    pendiente,
    onVer: (s) => setDialogo({ modo: "ver", superadministrador: s }),
    onModificar: (s) => setDialogo({ modo: "modificar", superadministrador: s }),
    // Activar va directo; inactivar corta el acceso de alguien: se confirma.
    onEstado: (s) => (s.activo ? setAInactivar(s) : cambiarEstado(s, true)),
  })

  const { table } = useDataTable({
    columns,
    data: pagina,
    pageCount,
    getRowId: (row) => String(row.pkSuperadministrador),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "superadministradores-column-visibility",
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Usuarios que administran la plataforma. Siempre hay al menos uno activo.">
          Superadministradores
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
              <Button
                color="primary"
                size="sm"
                onClick={() => setDialogo({ modo: "nuevo", superadministrador: null })}
              >
                <ControlPointIcon data-icon="inline-start" />
                Nuevo Superadministrador
              </Button>
            </TableScreenActions>
          )}
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {/* Sin estado vacío de catálogo: siempre hay al menos uno (Sección 7). Solo
            el de una búsqueda sin coincidencias. */}
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage={
            <span className="flex flex-col items-center gap-3">
              No hay Superadministradores que coincidan con la búsqueda y los filtros aplicados.
              <Button size="sm" variant="outline" color="neutral" onClick={clearAllFilters}>
                Limpiar filtros
              </Button>
            </span>
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

      <DialogSuperadministrador
        modo={dialogo?.modo ?? null}
        superadministrador={dialogo?.superadministrador ?? null}
        puedeEditar={permisos.puedeEditar}
        existentes={lista}
        onClose={() => setDialogo(null)}
        onModificar={(s) => setDialogo({ modo: "modificar", superadministrador: s })}
      />

      <AlertDialog
        open={aInactivar != null}
        onOpenChange={(open) => !open && !estado.isPending && setAInactivar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inactivar a {aInactivar?.nombre}</AlertDialogTitle>
            <AlertDialogDescription>
              Perderá el acceso a la plataforma y se cerrarán sus sesiones abiertas. Puede activarlo
              de nuevo cuando quiera.
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

      <AlertDialog open={bloqueo != null} onOpenChange={(open) => !open && setBloqueo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No se puede inactivar a {bloqueo?.nombre}</AlertDialogTitle>
            <AlertDialogDescription>{bloqueo?.mensaje}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction color="primary" onClick={() => setBloqueo(null)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableScreen>
  )
}
