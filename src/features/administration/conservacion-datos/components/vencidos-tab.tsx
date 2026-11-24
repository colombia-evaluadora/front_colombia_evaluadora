"use no memo"

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { paths } from "@/config/paths"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"

import {
  useConservacionConfigQuery,
  useVencidosQuery,
} from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import {
  DISPOSICION_LABELS,
  fechaCorta,
  type Vencido,
} from "@/features/administration/conservacion-datos/api/types"
import { DialogDisponer } from "@/features/administration/conservacion-datos/components/dialog-disponer"
import { ArchiveIcon, EyeIcon } from "@/components/ui/icons"
import { RowActions } from "@/features/administration/conservacion-datos/components/row-actions"
import { anchoAcciones } from "@/features/administration/conservacion-datos/lib/ancho-acciones"
import { paginarLocal } from "@/features/administration/conservacion-datos/lib/paginar-local"

const filaId = (v: Vencido) => `${v.pkPolitica}-${v.pkEstablecimiento}`

/** S.12.VEN.1, solo Superadministrador. La tarea diaria los calcula; disponer es siempre de una persona. */
export function VencidosTab() {
  const paginacion = useTablePagination()
  const { data = [], isPending, isError, error, refetch } = useVencidosQuery()
  const config = useConservacionConfigQuery()
  const navigate = useNavigate()
  const [disponer, setDisponer] = useState<Vencido | null>(null)

  const columns: ColumnDef<Vencido>[] = [
    {
      id: "tipoRegistro",
      accessorKey: "tipoRegistro",
      meta: { label: "Tipo de registro" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de registro" />,
      cell: ({ row }) => <span className="font-medium">{row.original.tipoRegistro}</span>,
    },
    {
      id: "establecimiento",
      accessorKey: "establecimiento",
      meta: { label: "Establecimiento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimiento" />,
    },
    {
      id: "cantidad",
      accessorKey: "cantidad",
      meta: { label: "Registros" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Registros" className="justify-center" />,
      cell: ({ row }) => (
        <span className="block text-center tabular-nums">{row.original.cantidad.toLocaleString("es-CO")}</span>
      ),
      size: 120,
    },
    {
      id: "vencidoDesde",
      accessorKey: "vencidoDesde",
      meta: { label: "Vencido desde" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vencido desde" />,
      cell: ({ row }) => <span className="tabular-nums">{fechaCorta(row.original.vencidoDesde)}</span>,
      size: 140,
    },
    {
      id: "disposicion",
      accessorFn: (v) => DISPOSICION_LABELS[v.disposicion],
      meta: { label: "Disposición" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Disposición" />,
      size: 140,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <RowActions
          items={[
            {
              label: "Ver detalle",
              icon: <EyeIcon />,
              // S.12.VEN.3: en su propia pantalla.
              onClick: () =>
                navigate({
                  to: paths.app.conservacionVencidoDetalle.getHref(row.original.pkPolitica, row.original.pkEstablecimiento),
                }),
            },
            { label: "Disponer", icon: <ArchiveIcon />, onClick: () => setDisponer(row.original) },
          ]}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: anchoAcciones(2),
    },
  ]

  const { pagina, pageCount, pageIndex } = paginarLocal(data, paginacion, (v, col) =>
    col === "cantidad" ? v.cantidad : String(v[col as keyof Vencido] ?? ""),
  )
  const { table } = useDataTable({
    columns,
    data: pagina,
    pageCount,
    getRowId: filaId,
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "conservacion-vencidos-column-visibility",
  })

  return (
    <>
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        errorMessage={error ? getErrorMessage(error) : undefined}
        emptyMessage="No hay registros vencidos."
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
      {disponer ? (
        <DialogDisponer
          key={filaId(disponer)}
          vencido={disponer}
          almacenamientoArchivo={config.data?.almacenamientoArchivo ?? false}
          onClose={() => setDisponer(null)}
        />
      ) : null}
    </>
  )
}

