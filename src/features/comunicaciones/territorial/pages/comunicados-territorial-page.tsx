"use no memo"

import { useEffect, useState } from "react"
import { format } from "date-fns"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { DatePicker } from "@/components/date-picker"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { SelectOpciones } from "@/components/select-opciones"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { DotsThreeVerticalIcon, EyeIcon, FunnelXIcon, XIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { comunicadosTerritorialRoute } from "@/router"
import { CLASES_HTML, htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"
import {
  useComunicadoTerritorialQuery,
  useComunicadosTerritorialQuery,
  useEstablecimientosTerritorialQuery,
  type EstadoTerritorial,
} from "@/features/comunicaciones/territorial/api/comunicados-territorial"
import type { ComunicadosTerritorialSearch } from "@/features/comunicaciones/territorial/api/schema"
import { AdjuntosTerritorial } from "@/features/comunicaciones/territorial/components/adjuntos-territorial"
import {
  createTerritorialColumns,
  ESTADOS_TERRITORIAL,
  EstadoTerritorialBadge,
} from "@/features/comunicaciones/territorial/components/table/columns-territorial"
import { dirigidoA } from "@/features/comunicaciones/territorial/lib/destinatarios"

const ESTADOS = Object.keys(ESTADOS_TERRITORIAL) as EstadoTerritorial[]

/**
 * Comunicados institucionales del Supervisor territorial y el Administrador territorial (Guía
 * M.1.TER.1/2): solo consulta, con el mismo listado que Publicados (buscador por título con filtros
 * avanzados y chips, tabla ordenable con columna Establecimiento, paginación y "Ver detalle" en el
 * hover). Sin "Nuevo comunicado" ni "Recibidos": no publican ni participan en la mensajería. El
 * filtro Establecimiento lista solo los de su alcance (a cargo del supervisor; todos para el
 * administrador): comms-service lo resuelve y también recorta la lista y el detalle.
 */
export function ComunicadosTerritorialPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle description="Consulta de los comunicados de sus establecimientos, sin publicar.">
            Comunicados institucionales
          </TableScreenTitle>
          <TableScreenToolbar>
            <FiltrosTerritorial />
          </TableScreenToolbar>
        </TableScreenHeader>
        <TableScreenBody>
          <TablaTerritorial />
        </TableScreenBody>
      </TableScreen>
    </NoticeProvider>
  )
}

type ClaveFiltro = "establecimiento" | "estado" | "desde"

/**
 * Buscador por título con el embudo de filtros avanzados (Establecimiento, Estado, Desde), como
 * Comunicados institucionales (M.1.LIS.1). Los aplicados se ven como chips removibles. Todo en la URL.
 */
function FiltrosTerritorial() {
  const search = comunicadosTerritorialRoute.useSearch()
  const navigate = comunicadosTerritorialRoute.useNavigate()
  const establecimientos = useEstablecimientosTerritorialQuery()
  const [abierto, setAbierto] = useState(false)
  const [establecimiento, setEstablecimiento] = useState(search.establecimiento ?? "")
  const [estado, setEstado] = useState<EstadoTerritorial | "">(search.estado ?? "")
  const [desde, setDesde] = useState(search.desde ?? "")

  // Al abrir, el panel arranca con los filtros vigentes.
  useEffect(() => {
    if (!abierto) return
    setEstablecimiento(search.establecimiento ?? "")
    setEstado(search.estado ?? "")
    setDesde(search.desde ?? "")
  }, [abierto, search.establecimiento, search.estado, search.desde])

  const cambiar = (cambios: Partial<ComunicadosTerritorialSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...cambios, page: 0 }), replace: true })

  const nombreEe = (id: string) => establecimientos.data?.find((o) => o.valor === id)?.etiqueta ?? id
  const chips = [
    search.establecimiento && {
      clave: "establecimiento" as const,
      texto: `Establecimiento: ${nombreEe(search.establecimiento)}`,
    },
    search.estado && { clave: "estado" as const, texto: `Estado: ${ESTADOS_TERRITORIAL[search.estado].etiqueta}` },
    search.desde && {
      clave: "desde" as const,
      texto: `Desde ${format(new Date(`${search.desde}T00:00:00`), "dd/MM/yyyy")}`,
    },
  ].filter(Boolean) as { clave: ClaveFiltro; texto: string }[]
  const hayFiltros = chips.length > 0 || !!search.q

  const limpiar = () => cambiar({ q: undefined, establecimiento: undefined, estado: undefined, desde: undefined })

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <SearchQueryBar
        id="territorial-q"
        label="Buscar por título"
        placeholder="Buscar por título"
        value={search.q ?? ""}
        onValueChange={(v) => cambiar({ q: v || undefined })}
        onClearAll={() => {
          limpiar()
          setAbierto(false)
        }}
        activeFilterCount={chips.length + (search.q ? 1 : 0)}
        badgeCount={chips.length}
        open={abierto}
        onOpenChange={setAbierto}
        onApply={() => {
          cambiar({
            establecimiento: establecimiento || undefined,
            estado: estado || undefined,
            desde: desde || undefined,
          })
          setAbierto(false)
        }}
        size="sm"
      >
        <div className="flex flex-col gap-3 px-4">
          <Field variant="outlined">
            <FieldLabel htmlFor="territorial-est">Establecimiento</FieldLabel>
            <SelectOpciones
              id="territorial-est"
              value={establecimiento}
              onValueChange={(x) => setEstablecimiento(x)}
              opciones={[
                { value: "", label: "Todos" },
                ...(establecimientos.data ?? []).map((o) => ({ value: o.valor, label: o.etiqueta })),
              ]}
            />
          </Field>
          <Field variant="outlined">
            <FieldLabel htmlFor="territorial-estado">Estado</FieldLabel>
            <SelectOpciones
              id="territorial-estado"
              value={estado}
              onValueChange={(x) => setEstado(x as EstadoTerritorial | "")}
              opciones={[
                { value: "", label: "Todos" },
                ...ESTADOS.map((k) => ({ value: k, label: ESTADOS_TERRITORIAL[k].etiqueta })),
              ]}
            />
          </Field>
          <Field variant="outlined">
            <FieldLabel htmlFor="territorial-desde">Desde</FieldLabel>
            <DatePicker
              id="territorial-desde"
              value={parseDateValue(desde)}
              onChange={(d) => setDesde(formatDateValue(d))}
            />
          </Field>
        </div>
      </SearchQueryBar>
      {hayFiltros && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {chips.map((c) => (
            <span
              key={c.clave}
              className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5"
            >
              <span className="truncate">{c.texto}</span>
              <button
                type="button"
                aria-label={`Quitar filtro ${c.texto}`}
                onClick={() => cambiar({ [c.clave]: undefined })}
                className="grid size-4 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <XIcon aria-hidden className="size-3.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={limpiar}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <FunnelXIcon aria-hidden className="size-3.5" />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}

/** Tabla de escritorio y tarjetas en móvil; orden y página en la URL, resueltos por comms-service. */
function TablaTerritorial() {
  const search = comunicadosTerritorialRoute.useSearch()
  const paginacion = useTablePagination()
  const [abierto, setAbierto] = useState<number | null>(null)
  const lista = useComunicadosTerritorialQuery(
    {
      q: search.q?.trim(),
      establecimiento: search.establecimiento,
      estado: search.estado,
      desde: search.desde,
      sortBy: search.sortBy,
      sortDir: search.sortBy ? search.sortDir : undefined,
    },
    { pagina: paginacion.pageIndex, tamano: paginacion.pageSize },
  )
  const filas = lista.data?.rows ?? []
  const pageCount = lista.data?.pageCount ?? 0
  const totalCount = lista.data?.totalCount ?? 0

  const { table } = useDataTable({
    columns: createTerritorialColumns({ onVer: (c) => setAbierto(c.id) }),
    data: filas,
    pageCount,
    getRowId: (c) => String(c.id),
    ...paginacion,
    columnVisibilityStorageKey: "comunicados-territorial-column-visibility",
  })

  return (
    <>
      {/* Móvil: tarjetas, para no desbordar con todas las columnas. */}
      <div className="md:hidden">
        {lista.isPending ? (
          <Spinner className="m-6" />
        ) : lista.isError ? (
          <p className="text-sm text-muted-foreground">
            {getErrorMessage(lista.error)}{" "}
            <button type="button" onClick={() => void lista.refetch()} className="font-medium text-primary underline">
              Reintentar
            </button>
          </p>
        ) : filas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay comunicados para mostrar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filas.map((c) => (
              <li key={c.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 font-medium break-words">{c.titulo}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Opciones de ${c.titulo}`}
                      className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-muted"
                    >
                      <DotsThreeVerticalIcon className="size-4.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setAbierto(c.id)}>
                        <EyeIcon aria-hidden />
                        Ver detalle
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(c.publicarEn), "dd/MM/yyyy")} · {c.establecimiento}
                </p>
                <p className="text-xs break-words text-muted-foreground">
                  {c.publicadoPor} · {c.destinatarios} destinatarios
                </p>
                <div className="mt-1">
                  <EstadoTerritorialBadge estado={c.estado} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="hidden md:block">
        <DataTable
          table={table}
          isPending={lista.isPending}
          isError={lista.isError}
          onRetry={() => void lista.refetch()}
          errorMessage={lista.error ? getErrorMessage(lista.error) : undefined}
          emptyMessage="No hay comunicados para mostrar."
          growColumnId="titulo"
        />
      </div>
      <Pagination
        viewOptions={<DataTableViewOptions table={table} />}
        pageIndex={paginacion.pageIndex}
        pageCount={Math.max(pageCount, 1)}
        canPrev={paginacion.pageIndex > 0}
        canNext={paginacion.pageIndex + 1 < pageCount}
        onPageChange={paginacion.goToPage}
        totalCount={totalCount}
        pageSize={paginacion.pageSize}
        onPageSizeChange={paginacion.setPageSize}
      />

      {abierto != null && <DetalleDialog id={abierto} onClose={() => setAbierto(null)} />}
    </>
  )
}

function DetalleDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useComunicadoTerritorialQuery(id)
  const d = q.data
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d?.comunicado.titulo ?? "Comunicado"}</DialogTitle>
        </DialogHeader>
        {q.isPending ? (
          <Spinner className="m-6" />
        ) : q.isError || !d ? (
          <p className="text-sm text-muted-foreground">{q.isError ? getErrorMessage(q.error) : "El comunicado no existe."}</p>
        ) : (
          <div className="min-h-0 space-y-3 overflow-y-auto text-sm">
            <dl className="text-xs text-muted-foreground">
              <div>
                <dt className="inline">Establecimiento: </dt>
                <dd className="inline">{d.comunicado.establecimiento}</dd>
              </div>
              <div>
                <dt className="inline">Publicado por: </dt>
                <dd className="inline">{d.comunicado.publicadoPor}</dd>
              </div>
              <div>
                <dt className="inline">Fecha: </dt>
                <dd className="inline">{format(new Date(d.comunicado.publicarEn), "dd/MM/yyyy - hh:mm a")}</dd>
              </div>
              <div>
                <dt className="inline">Dirigido a: </dt>
                <dd className="inline">{dirigidoA(d.comunicado)}</dd>
              </div>
            </dl>
            <EstadoTerritorialBadge estado={d.comunicado.estado} />
            {d.comunicado.estado === "ANULADO" ? (
              <p className="text-muted-foreground">El contenido ya no está disponible.</p>
            ) : (
              // Saneado con DOMPurify: solo etiquetas de formato, sin scripts ni on*.
              <div className={CLASES_HTML} dangerouslySetInnerHTML={{ __html: htmlSeguro(d.contenidoHtml) }} />
            )}
            <AdjuntosTerritorial adjuntos={d.adjuntos ?? []} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
