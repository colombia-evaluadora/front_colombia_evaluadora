"use no memo"

import { Fragment, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { Link } from "@tanstack/react-router"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import {
  ArrowLeftIcon,
  FileDownloadOutlinedIcon,
  InfoIcon,
  PencilIcon,
  ProhibitIcon,
  XCircleIcon,
} from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { exportarCsv, nombreArchivoSeguro } from "@/lib/csv"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { comunicadoDetalleRoute } from "@/router"
import type { Comunicado } from "@/features/comunicaciones/chat/api/types"
import { useComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-comunicado-query"
import {
  AnularDialog,
  CancelarDialog,
  EstadoComunicadoBadge,
} from "@/features/comunicaciones/chat/components/comunicado-panel"
import { descargarAdjunto } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { CLASES_HTML, htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"
import {
  comunicadosGestionKey,
  useSeguimientoComunicadoQuery,
  type PersonaSinCanal,
} from "@/features/comunicaciones/comunicados/api/comunicados-gestion"

/**
 * Detalle y seguimiento (Guía M.1.DET.1), en una tarjeta: cabecera con el título, su estado al lado y
 * Volver; pie fijo con Modificar / Cancelar / Anular según estado y autoría; los datos
 * de publicación, el mensaje y, para quien lo gestiona, el seguimiento por canal con las personas
 * sin canal o con correo fallido. Nunca se muestra quién leyó: solo el total.
 */
export function ComunicadoDetallePage() {
  return (
    <NoticeProvider>
      <DetalleContent />
    </NoticeProvider>
  )
}

function DetalleContent() {
  const { id } = comunicadoDetalleRoute.useParams()
  const q = useComunicadoQuery(Number(id))
  const c = q.data
  const queryClient = useQueryClient()
  const cargado = q.isSuccess
  // Abrir el comunicado lo marca leído en comms-service: se refresca la bandeja para quitar el punto.
  useEffect(() => {
    if (cargado) void queryClient.invalidateQueries({ queryKey: comunicadosGestionKey })
  }, [cargado, id, queryClient])

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <NoticeOutlet />
      {q.isPending ? (
        <Spinner className="m-6" />
      ) : q.isError || !c ? (
        <p className="text-sm text-muted-foreground">
          {q.isError ? getErrorMessage(q.error) : "El comunicado no existe."}{" "}
          <button type="button" onClick={() => void q.refetch()} className="font-medium text-primary underline">
            Reintentar
          </button>
        </p>
      ) : (
        <TarjetaComunicado c={c} />
      )}
    </div>
  )
}

function TarjetaComunicado({ c }: { c: Comunicado }) {
  const { notify } = useNotify()
  const [dialogo, setDialogo] = useState<"anular" | "cancelar" | null>(null)
  const gestiona = c.gestiona ?? c.esCreador
  const modificable = !!c.esCreador && (c.estado === "PUBLICADO" || c.estado === "PROGRAMADO")
  const cancelable = gestiona && c.estado === "PROGRAMADO"
  const anulable = gestiona && (c.estado === "PUBLICADO" || c.estado === "VENCIDO")
  const adjuntos = c.adjuntos ?? []
  const conAcciones = modificable || cancelable || anulable

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description="Comunicados institucionales"
          action={
            <Button
              size="sm"
              variant="outline"
              color="neutral"
              className="shrink-0"
              render={<Link to={paths.app.comunicacionesComunicados.getHref()} />}
              nativeButton={false}
            >
              <ArrowLeftIcon data-icon="inline-start" aria-hidden />
              Volver
            </Button>
          }
        >
          {/* El estado va al lado del título (M.1.DET.1). */}
          <span className="flex min-w-0 items-center gap-3">
            <span className="min-w-0 truncate">{c.titulo}</span>
            {c.estado && (
              <span className="shrink-0 text-sm font-normal">
                <EstadoComunicadoBadge estado={c.estado} />
              </span>
            )}
          </span>
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody
        className={cn("py-0", conAcciones && "rounded-b-none border-b-0")}
        contentClassName="px-0"
      >

      <div className="space-y-1 px-4 pt-4 text-muted-foreground">
        <p>
          Publicado por {c.publicadoPor}
          {c.publicadoPorRol ? ` (${c.publicadoPorRol})` : ""} ·{" "}
          <time dateTime={c.publicarEn}>{format(new Date(c.publicarEn), "dd/MM/yyyy H:mm")}</time>
        </p>
        {(c.visibleHasta || adjuntos.length > 0) && (
          <p className="break-words">
            {c.visibleHasta && <>Visible hasta: {format(new Date(`${c.visibleHasta}T00:00:00`), "dd/MM/yyyy")}</>}
            {c.visibleHasta && adjuntos.length > 0 && " · "}
            {adjuntos.length > 0 && (
              <>
                Adjuntos:{" "}
                {adjuntos.map((a, i) => (
                  <Fragment key={a.id}>
                    {i > 0 && ", "}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      title={`Descargar ${a.nombre}`}
                      onClick={() =>
                        void descargarAdjunto(a.archivoId, a.nombre).catch((error) =>
                          notify(getErrorMessage(error), { variant: "error" }),
                        )
                      }
                    >
                      {a.nombre}
                    </button>
                  </Fragment>
                ))}
              </>
            )}
          </p>
        )}
        {c.motivoAnulacion && <p>Motivo de la anulación: {c.motivoAnulacion}</p>}
      </div>

      <div
        className={cn("px-4 py-4", CLASES_HTML)}
        // Saneado con DOMPurify: solo etiquetas de formato, sin scripts ni on*.
        dangerouslySetInnerHTML={{ __html: htmlSeguro(c.contenidoHtml) }}
      />

      {gestiona && <Seguimiento c={c} />}
      </TableScreenBody>
      {/* Acciones del comunicado en el pie fijo, como los formularios de página completa. */}
      {conAcciones && (
        <TableScreenFooter>
          <span />
          <div className="flex flex-wrap justify-end gap-2">
            {anulable && (
              <Button type="button" variant="outline" color="destructive" onClick={() => setDialogo("anular")}>
                <ProhibitIcon data-icon="inline-start" aria-hidden />
                Anular
              </Button>
            )}
            {cancelable && (
              <Button type="button" variant="outline" color="neutral" onClick={() => setDialogo("cancelar")}>
                <XCircleIcon data-icon="inline-start" aria-hidden />
                Cancelar comunicado
              </Button>
            )}
            {modificable && (
              <Button
                render={<Link to={paths.app.comunicacionesComunicadoEditar.getHref(c.conversacionId)} />}
                nativeButton={false}
              >
                <PencilIcon data-icon="inline-start" aria-hidden />
                Modificar
              </Button>
            )}
          </div>
        </TableScreenFooter>
      )}

      {dialogo === "anular" && <AnularDialog comunicado={c} onClose={() => setDialogo(null)} />}
      {dialogo === "cancelar" && <CancelarDialog comunicado={c} onClose={() => setDialogo(null)} />}
    </TableScreen>
  )
}

/**
 * Seguimiento por canal. Si el endpoint no responde (404 mientras comms-service no lo despliegue),
 * se muestran los contadores que ya trae el comunicado (destinatarios y leídos) con un aviso.
 */
function Seguimiento({ c }: { c: Comunicado }) {
  const q = useSeguimientoComunicadoQuery(c.conversacionId, true)
  const s = q.data
  const sinDatos = q.isError || (q.isSuccess && !s)
  const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("es-CO"))

  const contadores: { etiqueta: string; valor: string }[] = [
    { etiqueta: "Destinatarios", valor: n(s?.destinatarios ?? c.totalDestinatarios) },
    { etiqueta: "Aviso en plataforma", valor: n(s?.conAviso) },
    { etiqueta: "Correos enviados", valor: n(s?.correosEnviados) },
    { etiqueta: "Correos fallidos", valor: n(s?.correosFallidos) },
    { etiqueta: "Sin canal", valor: n(s?.sinCanal) },
    { etiqueta: "Leídos", valor: n(s?.leidos ?? c.leidos) },
  ]

  return (
    <>
      <section aria-labelledby="seguimiento-titulo" className="border-t px-4 py-4">
        <h2 id="seguimiento-titulo" className="mb-3 text-base font-semibold">
          Seguimiento
        </h2>
        <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {contadores.map((x) => (
            // Como el prototipo M.1.DET.1: el número arriba y su rótulo debajo, separados por líneas verticales.
            <div key={x.etiqueta} className="flex flex-col-reverse gap-0.5 border-l px-3 text-center first:border-l-0">
              <dt className="text-xs text-muted-foreground">{x.etiqueta}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{q.isPending ? "…" : x.valor}</dd>
            </div>
          ))}
        </dl>
        {sinDatos && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            El seguimiento por canal aún no está disponible para este comunicado.
          </p>
        )}
      </section>
      {s && (
        <TablePaginationProvider>
          <SinCanal personas={s.personas} titulo={c.titulo} />
        </TablePaginationProvider>
      )}
    </>
  )
}

const COLUMNAS: ColumnDef<PersonaSinCanal>[] = [
  {
    id: "nombre",
    accessorKey: "nombre",
    meta: { label: "Persona" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Persona" />,
  },
  {
    id: "tipo",
    accessorKey: "tipo",
    meta: { label: "Tipo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
  },
  {
    id: "motivo",
    accessorKey: "motivo",
    meta: { label: "Motivo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo" />,
  },
  {
    id: "grupo",
    accessorFn: (p) => p.grupo ?? "",
    meta: { label: "Grupo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
    cell: ({ row }) => row.original.grupo || "—",
  },
]

const valorCelda = (p: PersonaSinCanal, columna: string) =>
  columna === "grupo" ? (p.grupo ?? "") : String(p[columna as keyof PersonaSinCanal] ?? "")

/** Personas sin canal o con correo fallido: orden y paginación en estado local (no tocan la URL). */
function SinCanal({ personas, titulo }: { personas: PersonaSinCanal[]; titulo: string }) {
  const paginacion = useTablePagination()
  const [orden] = paginacion.sorting
  const ordenadas = orden
    ? [...personas].sort((a, b) => {
        const r = valorCelda(a, orden.id).localeCompare(valorCelda(b, orden.id), "es", { numeric: true })
        return orden.desc ? -r : r
      })
    : personas
  const pageCount = Math.max(1, Math.ceil(ordenadas.length / paginacion.pageSize))
  const pageIndex = Math.min(paginacion.pageIndex, pageCount - 1)
  const pagina = ordenadas.slice(pageIndex * paginacion.pageSize, (pageIndex + 1) * paginacion.pageSize)

  const { table } = useDataTable({
    columns: COLUMNAS,
    data: pagina,
    pageCount,
    getRowId: (p) => `${p.nombre}-${p.tipo}-${p.grupo ?? ""}-${p.motivo}`,
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "comunicado-sin-canal-column-visibility",
  })

  // Exporta todas las personas (no solo la página) con las columnas visibles, en el orden actual.
  const exportar = () => {
    const columnas = table.getVisibleLeafColumns()
    exportarCsv(
      nombreArchivoSeguro(`sin canal - ${titulo}.csv`),
      columnas.map((col) => col.columnDef.meta?.label ?? col.id),
      ordenadas.map((p) => columnas.map((col) => valorCelda(p, col.id))),
    )
  }

  return (
    <section aria-labelledby="sin-canal-titulo" className="border-t px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="sin-canal-titulo" className="text-base font-semibold">
          Sin canal o correo fallido ({personas.length})
        </h2>
        <Button size="sm" variant="outline" color="neutral" disabled={personas.length === 0} onClick={exportar}>
          <FileDownloadOutlinedIcon data-icon="inline-start" aria-hidden />
          Exportar
        </Button>
      </div>
      <DataTable
        table={table}
        isPending={false}
        isError={false}
        onRetry={() => undefined}
        emptyMessage="Todos los destinatarios tienen al menos un canal."
      />
      <Pagination
        viewOptions={<DataTableViewOptions table={table} />}
        pageIndex={pageIndex}
        pageCount={pageCount}
        canPrev={pageIndex > 0}
        canNext={pageIndex < pageCount - 1}
        onPageChange={paginacion.goToPage}
        totalCount={personas.length}
        pageSize={paginacion.pageSize}
        onPageSizeChange={paginacion.setPageSize}
      />
    </section>
  )
}
