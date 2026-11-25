"use no memo"

import { useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
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
import { Button } from "@/components/ui/button"
import { ArchiveIcon, ArrowLeftIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

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

const VENCIDOS = { to: paths.app.conservacionDatos.getHref(), search: { tab: "vencidos" as const } }

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()

/**
 * Ver detalle de un lote vencido (Sección 6.4): pantalla propia, solo
 * consulta y solo para el Superadministrador. Disponer abre el mismo modal
 * del listado sobre el lote completo; el detalle no dispone nada.
 */
export function VencidoDetallePage() {
  return (
    <NoticeProvider>
      <VencidoDetalleContent />
    </NoticeProvider>
  )
}

function VencidoDetalleContent() {
  const { politica, establecimiento } = useParams({ strict: false }) as {
    politica?: string
    establecimiento?: string
  }
  const pkPolitica = Number(politica)
  const pkEstablecimiento = Number(establecimiento)
  const lotes = useVencidosQuery()
  const vencido = lotes.data?.find(
    (v) => v.pkPolitica === pkPolitica && v.pkEstablecimiento === pkEstablecimiento,
  )

  if (lotes.isError) return <ErrorNoticeBanner error={lotes.error} />
  if (lotes.isPending) return <Skeleton className="h-72" />
  if (!vencido) return <LoteNoEncontrado />
  return <Detalle vencido={vencido} />
}

function LoteNoEncontrado() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">El lote ya no tiene registros vencidos.</p>
      <Button size="sm" variant="outline" color="neutral" onClick={() => navigate(VENCIDOS)}>
        <ArrowLeftIcon data-icon="inline-start" />
        Volver
      </Button>
    </div>
  )
}

const columnas: ColumnDef<RegistroVencido>[] = [
  {
    id: "pkRegistro",
    accessorKey: "pkRegistro",
    meta: { label: "Registro" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Registro" />,
    cell: ({ row }) => <span className="tabular-nums">#{row.original.pkRegistro}</span>,
    size: 120,
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
    accessorKey: "fechaRegistro",
    meta: { label: "Fecha del registro" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha del registro" />,
    cell: ({ row }) =>
      row.original.fechaRegistro ? <span className="tabular-nums">{fechaCorta(row.original.fechaRegistro)}</span> : "—",
    size: 160,
  },
  {
    id: "vence",
    accessorKey: "vence",
    meta: { label: "Vence" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vence" />,
    cell: ({ row }) => <span className="tabular-nums">{fechaCorta(row.original.vence)}</span>,
    size: 140,
  },
]

function Detalle({ vencido }: { vencido: Vencido }) {
  const navigate = useNavigate()
  const paginacion = useTablePagination()
  const config = useConservacionConfigQuery()
  const [texto, setTexto] = useState("")
  const [disponer, setDisponer] = useState(false)
  const { data = [], isPending, isError, error, refetch } = useDetalleVencidoQuery(
    vencido.pkPolitica,
    vencido.pkEstablecimiento,
  )

  const q = normalizar(texto)
  const filtradas = q
    ? data.filter((r) => normalizar(r.estudiante ?? "").includes(q) || (r.documento ?? "").includes(texto.trim()))
    : data
  const { pagina, pageCount, pageIndex } = paginarLocal(filtradas, paginacion, (r, col) =>
    col === "pkRegistro" ? r.pkRegistro : String(r[col as keyof RegistroVencido] ?? ""),
  )
  const { table } = useDataTable({
    columns: columnas,
    data: pagina,
    pageCount,
    getRowId: (r) => String(r.pkRegistro),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "conservacion-vencido-detalle-column-visibility",
  })

  const resumen: [string, string][] = [
    ["Tipo de registro", vencido.tipoRegistro],
    ["Establecimiento", vencido.establecimiento],
    ["Vencido desde", fechaCorta(vencido.vencidoDesde)],
    ["Disposición", DISPOSICION_LABELS[vencido.disposicion]],
    ["Registros vencidos", vencido.cantidad.toLocaleString("es-CO")],
  ]

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>
          Conservación de datos <span className="text-muted-foreground">›</span> Vencidos{" "}
          <span className="text-muted-foreground">›</span> {vencido.tipoRegistro} · {vencido.establecimiento}
        </TableScreenTitle>
        <dl className="mx-(--screen-spacing) mb-3 grid gap-3 rounded-md border border-border p-4 sm:grid-cols-3 lg:grid-cols-5">
          {resumen.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
              <dd className="truncate text-sm font-medium">{valor}</dd>
            </div>
          ))}
        </dl>
        <TableScreenToolbar>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <SearchQueryBar
              id="vencido-detalle-buscar"
              placeholder="Buscar por estudiante (nombre o documento)"
              value={texto}
              onValueChange={(v) => {
                setTexto(v)
                paginacion.goToPage(0)
              }}
              onClearAll={() => setTexto("")}
              activeFilterCount={texto.trim() ? 1 : 0}
            />
          </div>
          <TableScreenActions>
            <Button size="sm" variant="outline" color="neutral" onClick={() => navigate(VENCIDOS)}>
              <ArrowLeftIcon data-icon="inline-start" />
              Volver
            </Button>
            <Button size="sm" color="primary" onClick={() => setDisponer(true)}>
              <ArchiveIcon data-icon="inline-start" />
              Disponer
            </Button>
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage={q ? "Ningún registro coincide con la búsqueda." : "El lote ya no tiene registros vencidos."}
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
      {disponer ? (
        <DialogDisponer
          vencido={vencido}
          almacenamientoArchivo={config.data?.almacenamientoArchivo ?? false}
          onClose={() => setDisponer(false)}
          onDispuesto={() => {
            // El lote desaparece al disponerlo: se vuelve a Vencidos con el aviso.
            queueNotice(SUCCESS_MESSAGES.loteVencido.created)
            navigate(VENCIDOS)
          }}
        />
      ) : null}
    </TableScreen>
  )
}
