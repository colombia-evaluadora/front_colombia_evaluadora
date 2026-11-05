"use no memo"

import type { ColumnDef } from "@tanstack/react-table"
import { useNavigate } from "@tanstack/react-router"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { paginarLocal } from "@/features/administration/conservacion-datos/lib/paginar-local"
import { Badge } from "@/components/ui/badge"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useEstadoPolitica } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import { usePoliticasQuery } from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import {
  CUENTA_DESDE_LABELS,
  DISPOSICION_LABELS,
  type Politica,
} from "@/features/administration/conservacion-datos/api/types"
import { CheckCircleIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"
import { RowActions } from "@/features/administration/conservacion-datos/components/row-actions"
import { anchoAcciones } from "@/features/administration/conservacion-datos/lib/ancho-acciones"

const SIN_VALOR = <span className="text-muted-foreground">—</span>

/** S.12.POL.1: una fila por tipo de registro. Administrador y Gestor solo consultan. */
export function PoliticasTab({ puedeEditar }: { puedeEditar: boolean }) {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const paginacion = useTablePagination()
  const { data = [], isPending, isError, error, refetch } = usePoliticasQuery()
  const estado = useEstadoPolitica({
    mutationConfig: {
      onSuccess: (p) =>
        notify(p.habilitado ? SUCCESS_MESSAGES.politicaConservacion.activated : SUCCESS_MESSAGES.politicaConservacion.deactivated),
      onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
    },
  })

  const columns: ColumnDef<Politica>[] = [
    {
      id: "tipoRegistro",
      accessorKey: "tipoRegistro",
      meta: { label: "Tipo de registro" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de registro" />,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className={row.original.habilitado ? "font-medium" : "font-medium text-muted-foreground"}>
            {row.original.tipoRegistro}
          </span>
          {!row.original.permanente && !row.original.conFuente ? (
            <span className="text-xs text-muted-foreground">La plataforma aún no lee este tipo: no vence.</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "modulo",
      accessorKey: "modulo",
      meta: { label: "Módulo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Módulo" />,
    },
    {
      id: "plazo",
      accessorFn: (p) => (p.permanente ? 1000 : (p.plazoMinimo ?? 0)),
      meta: { label: "Plazo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plazo" />,
      cell: ({ row }) =>
        row.original.permanente ? (
          <Badge variant="soft" color="info">
            Permanente
          </Badge>
        ) : (
          <span className="tabular-nums">
            {row.original.plazoMinimo} {row.original.plazoMinimo === 1 ? "año" : "años"}
          </span>
        ),
      size: 130,
    },
    {
      id: "cuentaDesde",
      accessorFn: (p) => (p.cuentaDesde ? CUENTA_DESDE_LABELS[p.cuentaDesde] : ""),
      meta: { label: "Se cuenta desde" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Se cuenta desde" />,
      cell: ({ row }) => (row.original.cuentaDesde ? CUENTA_DESDE_LABELS[row.original.cuentaDesde] : SIN_VALOR),
    },
    {
      id: "disposicion",
      accessorFn: (p) => (p.disposicion ? DISPOSICION_LABELS[p.disposicion] : ""),
      meta: { label: "Disposición final" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Disposición final" />,
      cell: ({ row }) => (row.original.disposicion ? DISPOSICION_LABELS[row.original.disposicion] : SIN_VALOR),
    },
    {
      id: "habilitado",
      accessorFn: (p) => (p.habilitado ? "Activa" : "Inactiva"),
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.habilitado ? (
          <Badge variant="soft" color="success">
            Activa
          </Badge>
        ) : (
          <Badge variant="outline" color="neutral">
            Inactiva
          </Badge>
        ),
      size: 110,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const p = row.original
        return (
          <RowActions
            items={
              puedeEditar
                ? [
                    {
                      label: "Modificar",
                      icon: <PencilIcon />,
                      onClick: () =>
                        navigate({ to: paths.app.conservacionPoliticaEditar.getHref(p.pkPolitica) }),
                    },
                    {
                      label: p.habilitado ? "Inactivar" : "Activar",
                      icon: p.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />,
                      disabled: estado.isPending,
                      onClick: () => estado.mutate({ id: p.pkPolitica, habilitado: !p.habilitado }),
                    },
                  ]
                : []
            }
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: anchoAcciones(puedeEditar ? 2 : 0),
    },
  ]

  const { pagina, pageCount, pageIndex } = paginarLocal(data, paginacion, (p, col) =>
    col === "plazo" ? (p.permanente ? 1000 : (p.plazoMinimo ?? 0)) : String(p[col as keyof Politica] ?? ""),
  )
  const { table } = useDataTable({
    columns,
    data: pagina,
    pageCount,
    getRowId: (row) => String(row.pkPolitica),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "conservacion-politicas-column-visibility",
  })

  return (
    <>
    <DataTable
      table={table}
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
      errorMessage={error ? getErrorMessage(error) : undefined}
      emptyMessage={
        puedeEditar
          ? "Aún no hay políticas: ningún registro vence. Use Política para agregar la primera."
          : "Aún no hay políticas de conservación."
      }
    />
    <Pagination
      viewOptions={<DataTableViewOptions table={table} />}
      pageIndex={pageIndex}
      pageCount={pageCount}
      canPrev={pageIndex > 0}
      canNext={pageIndex < pageCount - 1}
      onPageChange={paginacion.goToPage}
      totalCount={data.length}
      pageSize={paginacion.pageSize}
      onPageSizeChange={paginacion.setPageSize}
    />
    </>
  )
}
