"use no memo"

import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@/components/ui/icons"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"
import { employeeRolesRoute } from "@/router"

import { useActivarRol } from "@/features/establishment/employees/api/mutations/roles-funcionario"
import { useFuncionarioFichaQuery } from "@/features/establishment/employees/api/query/use-funcionario-ficha"
import { useRolesFuncionarioQuery } from "@/features/establishment/employees/api/query/use-roles-funcionario"
import type { RolAsignado } from "@/features/establishment/employees/api/types/rol-asignado"
import { useEstablecimientoFuncionarios } from "@/features/establishment/employees/hooks/use-establecimiento-funcionarios"
import { createRolesColumns, type AccionRol } from "@/features/establishment/employees/components/table/columns-roles"
import { DialogAsignarRol } from "@/features/establishment/employees/components/dialogs/roles/dialog-asignar-rol"
import { DialogConfirmarRol } from "@/features/establishment/employees/components/dialogs/roles/dialog-confirmar-rol"
import { DialogVigenciaRol } from "@/features/establishment/employees/components/dialogs/roles/dialog-vigencia-rol"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const sinPaginar = { pageIndex: 0, pageSize: 1000, goToPage: () => {}, setPageSize: () => {}, sorting: [], setSorting: () => {} }

/**
 * Roles y permisos del funcionario en el establecimiento (Sección 4.2): sus roles por Sede y
 * Jornada con Vigente hasta, y desde cada uno Inactivar/Activar, Permisos, Prorrogar y Eliminar.
 */
export function EmployeeRolesPage() {
  const { employeeId } = employeeRolesRoute.useParams()
  const search = employeeRolesRoute.useSearch()
  const establecimiento = useEstablecimientoFuncionarios(search.establecimiento)
  const funcionarioId = Number(employeeId)
  const { notify } = useNotify()
  const { puedeEditar } = useMenuPermission("FUNCIONARIOS")

  const ficha = useFuncionarioFichaQuery(funcionarioId, establecimiento.id)
  const roles = useRolesFuncionarioQuery(funcionarioId, establecimiento.id)
  const activar = useActivarRol()
  const [accion, setAccion] = useState<{ tipo: AccionRol; rol: RolAsignado } | null>(null)

  const nombre = ficha.data
    ? [ficha.data.firstName, ficha.data.middleName, ficha.data.lastName, ficha.data.secondLastName].filter(Boolean).join(" ")
    : ""
  const documento = ficha.data ? [ficha.data.documentTypeCode, ficha.data.identification].filter(Boolean).join(" ") : ""

  function onAction(tipo: AccionRol, rol: RolAsignado) {
    // Un rol inactivo que no venció se activa directo; si venció se pide la nueva fecha (Regla 94).
    if (tipo === "activar" && !rol.expired) {
      activar.mutate(
        { asignacionId: rol.id, changeValidity: false, validUntil: "" },
        {
          onSuccess: () => notify(`Se activó el rol ${rol.roleName}.`),
          onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
        },
      )
      return
    }
    setAccion({ tipo, rol })
  }

  const { table } = useDataTable({
    ...sinPaginar,
    columns: createRolesColumns({ funcionarioId, establishmentId: establecimiento.id ?? 0, onAction }),
    data: roles.data ?? [],
    pageCount: 1,
    getRowId: (row) => String(row.id),
    columnVisibilityStorageKey: "table-employee-roles-column-visibility",
  })

  const listSearch = { establecimiento: establecimiento.id ?? undefined }
  const cerrar = () => setAccion(null)

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                render={<Link to={paths.app.establishments.officials.getHref()} search={listSearch} />}
                nativeButton={false}
                variant="outline"
                color="neutral"
                size="sm"
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Volver
              </Button>
              {puedeEditar && establecimiento.id != null && ficha.data ? (
                <DialogAsignarRol funcionarioId={funcionarioId} establishmentId={establecimiento.id} employeeName={nombre} />
              ) : null}
            </div>
          }
        >
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate">Roles y permisos{nombre ? ` — ${nombre}` : ""}</span>
            {documento ? (
              <Badge variant="outline" color="neutral" className="tabular-nums">
                {documento}
              </Badge>
            ) : null}
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={roles.isPending || establecimiento.cargando}
          isError={roles.isError || ficha.isError}
          onRetry={() => {
            void roles.refetch()
            void ficha.refetch()
          }}
          errorMessage={roles.error ? getErrorMessage(roles.error) : ficha.error ? getErrorMessage(ficha.error) : undefined}
          emptyMessage="El funcionario no tiene roles en este establecimiento. Use Asignar permisos para darle uno."
        />
      </TableScreenBody>

      <DialogConfirmarRol
        accion={accion?.tipo === "eliminar" ? "eliminar" : "inactivar"}
        rol={accion?.tipo === "inactivar" || accion?.tipo === "eliminar" ? accion.rol : null}
        employeeName={nombre}
        onClose={cerrar}
      />
      <DialogVigenciaRol
        accion={accion?.tipo === "activar" ? "activar" : "prorrogar"}
        rol={accion?.tipo === "prorrogar" || accion?.tipo === "activar" ? accion.rol : null}
        employeeName={nombre}
        onClose={cerrar}
      />
    </TableScreen>
  )
}
