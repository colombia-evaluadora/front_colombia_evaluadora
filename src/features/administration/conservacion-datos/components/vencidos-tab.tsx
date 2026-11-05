"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"

import {
  useConservacionConfigQuery,
  useDetalleVencidoQuery,
  useVencidosQuery,
} from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import {
  DISPOSICION_LABELS,
  fechaCorta,
  type RegistroVencido,
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
  const [detalle, setDetalle] = useState<Vencido | null>(null)
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Registros" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.cantidad.toLocaleString("es-CO")}</span>,
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
            { label: "Ver detalle", icon: <EyeIcon />, onClick: () => setDetalle(row.original) },
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
      {detalle ? <DialogDetalleVencido vencido={detalle} onClose={() => setDetalle(null)} /> : null}
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

/** Ver detalle: la lista de registros del lote, con la misma tabla de la pantalla. */
function DialogDetalleVencido({ vencido, onClose }: { vencido: Vencido; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {vencido.tipoRegistro} · {vencido.establecimiento}
          </DialogTitle>
        </DialogHeader>
        <TablePaginationProvider>
          <TablaDetalle vencido={vencido} />
        </TablePaginationProvider>
      </DialogContent>
    </Dialog>
  )
}

const columnasDetalle: ColumnDef<RegistroVencido>[] = [
  {
    id: "estudiante",
    accessorKey: "estudiante",
    meta: { label: "Estudiante" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="font-medium">{row.original.estudiante}</span>
        <span className="text-xs text-muted-foreground">{row.original.documento}</span>
      </span>
    ),
  },
  {
    id: "anio",
    accessorKey: "anio",
    meta: { label: "Año" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.anio}</span>,
    size: 90,
  },
  {
    id: "vencidoDesde",
    accessorKey: "vencidoDesde",
    meta: { label: "Vencido desde" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vencido desde" />,
    cell: ({ row }) => <span className="tabular-nums">{fechaCorta(row.original.vencidoDesde)}</span>,
    size: 140,
  },
]

function TablaDetalle({ vencido }: { vencido: Vencido }) {
  const paginacion = useTablePagination()
  const { data = [], isPending, isError, error, refetch } = useDetalleVencidoQuery(vencido)
  const { pagina, pageCount, pageIndex } = paginarLocal(data, paginacion, (r, col) =>
    col === "anio" ? r.anio : String(r[col as keyof RegistroVencido] ?? ""),
  )
  const { table } = useDataTable({
    columns: columnasDetalle,
    data: pagina,
    pageCount,
    getRowId: (r) => `${r.documento}-${r.anio}-${r.vencidoDesde}`,
    ...paginacion,
    pageIndex,
  })
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* Scroll solo en la tabla: título y paginación quedan fijos. */}
      <div className="max-h-[60vh] min-w-0 overflow-y-auto">
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        errorMessage={error ? getErrorMessage(error) : undefined}
        emptyMessage="El lote ya no tiene registros vencidos."
      />
      </div>
      <Pagination
        pageIndex={pageIndex}
        pageCount={pageCount}
        canPrev={pageIndex > 0}
        canNext={pageIndex < pageCount - 1}
        onPageChange={paginacion.goToPage}
        totalCount={data.length}
        pageSize={paginacion.pageSize}
        onPageSizeChange={paginacion.setPageSize}
      />
    </div>
  )
}
