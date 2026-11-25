"use no memo"

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { FichaDatos } from "@/components/ficha-datos"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider, queueNotice } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArchiveIcon, ArrowLeftIcon, EyeSlashIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { conservacionVencidoDetalleRoute } from "@/router"

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
import { paginarLocal } from "@/features/administration/conservacion-datos/lib/paginar-local"

const VENCIDOS = `${paths.app.conservacionDatos.getHref()}?tab=vencidos`

/**
 * S.12.VEN.3: los registros de un lote vencido, en su propia pantalla y solo de consulta (no dispone
 * nada). Solo el Superadministrador. Volver regresa a Vencidos; Disponer abre el modal del lote completo.
 */
export function VencidoDetallePage() {
  return (
    <NoticeProvider>
      <TablePaginationProvider>
        <VencidoDetalleContent />
      </TablePaginationProvider>
    </NoticeProvider>
  )
}

function VencidoDetalleContent() {
  const navigate = useNavigate()
  const { politicaId, establecimientoId } = conservacionVencidoDetalleRoute.useParams()
  const vencidos = useVencidosQuery()
  const config = useConservacionConfigQuery()
  const lote =
    vencidos.data?.find(
      (v) => v.pkPolitica === Number(politicaId) && v.pkEstablecimiento === Number(establecimientoId),
    ) ?? null
  const [disponer, setDisponer] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const paginacion = useTablePagination()

  const volver = () => navigate({ to: VENCIDOS })
  const anonimizar = lote?.disposicion === "ANONIMIZAR"

  return (
    <TableScreen>
      <TableScreenHeader>
        {/* Encabezado con miga (diseño de Figma): ruta en gris y el título en negrita; el buscador y las
            acciones van en la barra del encabezado. */}
        <TableScreenTitle
          ruta="Conservación de datos › Vencidos"
          description="Registros del lote vencido. Solo consulta: Disponer aplica la disposición de la política a todo el lote."
        >
          {lote ? `${lote.tipoRegistro} · ${lote.establecimiento}` : "Detalle del lote"}
        </TableScreenTitle>
        <TableScreenToolbar>
          {lote ? (
            <SearchQueryBar
              id="vencido-detalle-search"
              label="Buscar por estudiante (nombre o documento)"
              placeholder="Buscar"
              value={busqueda}
              onValueChange={(v) => {
                setBusqueda(v)
                paginacion.goToPage(0)
              }}
              onClearAll={() => setBusqueda("")}
              activeFilterCount={busqueda ? 1 : 0}
            />
          ) : null}
          <TableScreenActions className="ml-auto">
            <Button variant="outline" color="neutral" size="sm" onClick={volver}>
              <ArrowLeftIcon data-icon="inline-start" />
              Volver
            </Button>
            {lote ? (
              <Button color="primary" size="sm" onClick={() => setDisponer(true)}>
                {anonimizar ? <EyeSlashIcon data-icon="inline-start" /> : <ArchiveIcon data-icon="inline-start" />}
                Disponer
              </Button>
            ) : null}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        {vencidos.isError ? (
          <ErrorNoticeBanner error={vencidos.error} />
        ) : vencidos.isPending ? (
          <Skeleton className="h-72" />
        ) : !lote ? (
          <p className="text-sm text-muted-foreground">Este lote ya no tiene registros vencidos.</p>
        ) : (
          <DetalleLote lote={lote} busqueda={busqueda} />
        )}
      </TableScreenBody>
      {disponer && lote ? (
        <DialogDisponer
          vencido={lote}
          almacenamientoArchivo={config.data?.almacenamientoArchivo ?? false}
          onClose={() => setDisponer(false)}
          onDispuesto={() => {
            // El lote ya no existe: se vuelve a Vencidos con el aviso.
            queueNotice(SUCCESS_MESSAGES.loteVencido.created)
            volver()
          }}
        />
      ) : null}
    </TableScreen>
  )
}

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

const columnas: ColumnDef<RegistroVencido>[] = [
  {
    id: "registro",
    accessorFn: (r) => r.registro ?? "",
    meta: { label: "Registro" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Registro" />,
    cell: ({ row }) => row.original.registro ?? <span className="text-muted-foreground">—</span>,
  },
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
    id: "fechaRegistro",
    accessorFn: (r) => r.fechaRegistro ?? "",
    meta: { label: "Fecha del registro" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha del registro" />,
    cell: ({ row }) =>
      row.original.fechaRegistro ? (
        <span className="tabular-nums">{fechaCorta(row.original.fechaRegistro)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "vencidoDesde",
    accessorKey: "vencidoDesde",
    meta: { label: "Vence" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vence" />,
    cell: ({ row }) => <span className="tabular-nums">{fechaCorta(row.original.vencidoDesde)}</span>,
  },
]

function DetalleLote({ lote, busqueda }: { lote: Vencido; busqueda: string }) {
  const paginacion = useTablePagination()
  const { data = [], isPending, isError, error, refetch } = useDetalleVencidoQuery(lote)

  // Búsqueda por estudiante (nombre o documento), en el navegador.
  const q = normalizar(busqueda.trim())
  const filtradas = q
    ? data.filter((r) => normalizar(r.estudiante).includes(q) || r.documento.includes(busqueda.trim()))
    : data
  const { pagina, pageCount, pageIndex } = paginarLocal(filtradas, paginacion, (r, col) =>
    String(r[col as keyof RegistroVencido] ?? ""),
  )
  const { table } = useDataTable({
    columns: columnas,
    data: pagina,
    pageCount,
    getRowId: (r) => `${r.documento}-${r.registro ?? ""}-${r.fechaRegistro ?? r.anio}`,
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "conservacion-vencido-detalle-column-visibility",
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen del lote. */}
      <div className="flex flex-col gap-3">
        <Badge variant="soft" color="warning" className="w-fit tabular-nums">
          {lote.cantidad.toLocaleString("es-CO")} {lote.cantidad === 1 ? "registro vencido" : "registros vencidos"}
        </Badge>
        <FichaDatos
          datos={[
            { etiqueta: "Tipo de registro", valor: lote.tipoRegistro },
            { etiqueta: "Establecimiento", valor: lote.establecimiento },
            { etiqueta: "Vencido desde", valor: <span className="tabular-nums">{fechaCorta(lote.vencidoDesde)}</span> },
            { etiqueta: "Disposición de la política", valor: DISPOSICION_LABELS[lote.disposicion] },
          ]}
        />
      </div>

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        errorMessage={error ? getErrorMessage(error) : undefined}
        emptyMessage={
          q ? "Ningún registro coincide con la búsqueda." : "Este lote ya no tiene registros vencidos."
        }
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
    </div>
  )
}
