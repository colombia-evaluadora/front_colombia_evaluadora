"use no memo"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { DatePicker } from "@/components/date-picker"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { CaretLeftIcon, CaretRightIcon, ControlPointIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { cn } from "@/lib/utils"
import { comunicadosRoute } from "@/router"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import type { EstadoComunicado } from "@/features/comunicaciones/chat/api/types"
import { useComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-comunicado-query"
import {
  AnularDialog,
  CancelarDialog,
  ComunicadoArticulo,
  EstadoComunicadoBadge,
  type ComunicadoAccion,
} from "@/features/comunicaciones/chat/components/comunicado-panel"
import {
  comunicadosGestionKey,
  useComunicadosGestionQuery,
  type ComunicadoGestion,
  type OrdenComunicados,
  type PestanaComunicados,
  type TipoFiltroComunicado,
} from "@/features/comunicaciones/comunicados/api/comunicados-gestion"
import {
  createComunicadosColumns,
  MenuAccionesComunicado,
  type DialogoComunicado,
} from "@/features/comunicaciones/comunicados/components/table/columns-comunicados"
import { tiposAbreviados } from "@/features/comunicaciones/comunicados/lib/tipos-destinatario"

const ESTADOS: { valor: EstadoComunicado; etiqueta: string }[] = [
  { valor: "PUBLICADO", etiqueta: "Publicado" },
  { valor: "PROGRAMADO", etiqueta: "Programado" },
  { valor: "VENCIDO", etiqueta: "Vencido" },
  { valor: "CANCELADO", etiqueta: "Cancelado" },
  { valor: "ANULADO", etiqueta: "Anulado" },
]

const TIPOS_FILTRO: { valor: TipoFiltroComunicado; etiqueta: string }[] = [
  { valor: "ESTUDIANTES", etiqueta: "Estudiantes" },
  { valor: "ACUDIENTES", etiqueta: "Acudientes" },
  { valor: "FUNCIONARIOS", etiqueta: "Funcionarios" },
]

const fecha = (iso: string) => format(new Date(iso), "dd/MM")

/**
 * "Comunicados institucionales" (Guía M.1.LIS.1 y M.1.REC.1). Publicados es la gestión de quien
 * publica (con el permiso COMUNICADOS): búsqueda por título, estado, fecha desde y el menú ⁞ (Ver
 * detalle, Modificar solo el autor, Cancelar los programados y Anular los publicados). Recibidos y
 * Anteriores (los vencidos) son la bandeja de cualquier funcionario: el punto marca los no leídos y
 * abrir uno lo marca leído; nunca se ve la lista de destinatarios.
 */
export function ComunicadosPage() {
  return (
    <NoticeProvider>
      <ComunicadosContent />
    </NoticeProvider>
  )
}

function ComunicadosContent() {
  const search = comunicadosRoute.useSearch()
  const navigate = comunicadosRoute.useNavigate()
  const permiso = useMenuPermission("COMUNICADOS")
  const publica = permiso.puedeCrear
  const pestana: PestanaComunicados = search.pestana ?? (publica ? "PUBLICADOS" : "RECIBIDOS")
  const gestion = pestana === "PUBLICADOS"

  const cambiar = (cambios: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...cambios, page: 0 }), replace: true })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            publica && (
              <Button
                size="sm"
                render={<Link to={paths.app.comunicacionesComunicadoNuevo.getHref()} />}
                nativeButton={false}
              >
                <ControlPointIcon data-icon="inline-start" aria-hidden />
                Nuevo comunicado
              </Button>
            )
          }
        >
          Comunicados institucionales
        </TableScreenTitle>
        <TableScreenTabs className="pt-2">
          <Tabs
            value={pestana}
            onValueChange={(v) =>
              void navigate({ search: { pestana: v as PestanaComunicados, page: 0, pageSize: search.pageSize } })
            }
          >
            <TabsList>
              {publica && <TabsTrigger value="PUBLICADOS">Publicados</TabsTrigger>}
              <TabsTrigger value="RECIBIDOS">Recibidos</TabsTrigger>
              <TabsTrigger value="ANTERIORES">Anteriores</TabsTrigger>
            </TabsList>
          </Tabs>
        </TableScreenTabs>
        <TableScreenToolbar>
          {gestion ? (
            <FiltrosPublicados />
          ) : (
            <Field className="w-full max-w-sm">
              <FieldLabel htmlFor="comunicados-q">Buscar por título</FieldLabel>
              <Input
                id="comunicados-q"
                value={search.q ?? ""}
                onChange={(e) => cambiar({ q: e.target.value || undefined })}
              />
            </Field>
          )}
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>{gestion ? <TablaPublicados /> : <Bandeja pestana={pestana} />}</TableScreenBody>
    </TableScreen>
  )
}

const etiquetaEstado = (e: EstadoComunicado) => ESTADOS.find((x) => x.valor === e)?.etiqueta ?? e
const etiquetaTipo = (t: TipoFiltroComunicado) => TIPOS_FILTRO.find((x) => x.valor === t)?.etiqueta ?? t

/**
 * Buscador de Publicados (M.1.LIS.1): un solo campo "Buscar por título" con el embudo que abre los
 * filtros avanzados (Estado, Desde, Emisor y Tipo de destinatario). Los aplicados se ven como chips
 * removibles debajo, con "Limpiar filtros". Todo vive en la URL.
 */
function FiltrosPublicados() {
  const search = comunicadosRoute.useSearch()
  const navigate = comunicadosRoute.useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<EstadoComunicado | "">(search.estado ?? "")
  const [desde, setDesde] = useState(search.desde ?? "")
  const [emisor, setEmisor] = useState(search.emisor ?? "")
  const [tipo, setTipo] = useState<TipoFiltroComunicado | "">(search.tipo ?? "")

  // Al abrir, el panel arranca con los filtros vigentes.
  useEffect(() => {
    if (!abierto) return
    setEstado(search.estado ?? "")
    setDesde(search.desde ?? "")
    setEmisor(search.emisor ?? "")
    setTipo(search.tipo ?? "")
  }, [abierto, search.estado, search.desde, search.emisor, search.tipo])

  const cambiar = (cambios: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...cambios, page: 0 }), replace: true })

  const chips = [
    search.estado && { clave: "estado" as const, texto: `Estado: ${etiquetaEstado(search.estado)}` },
    search.desde && {
      clave: "desde" as const,
      texto: `Desde ${format(new Date(`${search.desde}T00:00:00`), "dd/MM/yyyy")}`,
    },
    search.emisor && { clave: "emisor" as const, texto: `Emisor: ${search.emisor}` },
    search.tipo && { clave: "tipo" as const, texto: `Destinatarios: ${etiquetaTipo(search.tipo)}` },
  ].filter(Boolean) as { clave: "estado" | "desde" | "emisor" | "tipo"; texto: string }[]
  const hayFiltros = chips.length > 0 || !!search.q

  const limpiar = () =>
    cambiar({ q: undefined, estado: undefined, desde: undefined, emisor: undefined, tipo: undefined })

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <SearchQueryBar
        id="comunicados-q"
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
            estado: estado || undefined,
            desde: desde || undefined,
            emisor: emisor.trim() || undefined,
            tipo: tipo || undefined,
          })
          setAbierto(false)
        }}
        size="sm"
      >
        <div className="flex flex-col gap-3 px-4">
          <Field>
            <FieldLabel htmlFor="comunicados-estado">Estado</FieldLabel>
            <NativeSelect
              id="comunicados-estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoComunicado | "")}
            >
              <NativeSelectOption value="">Todos</NativeSelectOption>
              {ESTADOS.map((x) => (
                <NativeSelectOption key={x.valor} value={x.valor}>
                  {x.etiqueta}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="comunicados-desde">Desde</FieldLabel>
            <DatePicker
              id="comunicados-desde"
              value={parseDateValue(desde)}
              onChange={(d) => setDesde(formatDateValue(d))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="comunicados-emisor">Emisor</FieldLabel>
            <Input
              id="comunicados-emisor"
              maxLength={100}
              placeholder="Nombre de quien publicó"
              value={emisor}
              onChange={(e) => setEmisor(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="comunicados-tipo">Tipo de destinatario</FieldLabel>
            <NativeSelect
              id="comunicados-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoFiltroComunicado | "")}
            >
              <NativeSelectOption value="">Todos</NativeSelectOption>
              {TIPOS_FILTRO.map((x) => (
                <NativeSelectOption key={x.valor} value={x.valor}>
                  {x.etiqueta}
                </NativeSelectOption>
              ))}
            </NativeSelect>
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
            <XIcon aria-hidden className="size-3.5" />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}

function useLista(pestana: PestanaComunicados) {
  const search = comunicadosRoute.useSearch()
  return useComunicadosGestionQuery({
    pestana,
    q: search.q,
    estado: pestana === "PUBLICADOS" ? search.estado : undefined,
    desde: pestana === "PUBLICADOS" ? search.desde : undefined,
    emisor: pestana === "PUBLICADOS" ? search.emisor : undefined,
    tipo: pestana === "PUBLICADOS" ? search.tipo : undefined,
    sortBy: pestana === "PUBLICADOS" ? (search.sortBy as OrdenComunicados | undefined) : undefined,
    sortDir: pestana === "PUBLICADOS" ? search.sortDir : undefined,
    page: search.page,
    pageSize: search.pageSize,
  })
}

/** Cargando, error o vacío; null cuando hay filas que mostrar. */
function estadoLista({
  lista,
  vacio,
}: {
  lista: ReturnType<typeof useLista>
  vacio: string
}) {
  if (lista.isPending) return <Spinner className="m-6" />
  if (lista.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        {getErrorMessage(lista.error)}{" "}
        <button type="button" onClick={() => void lista.refetch()} className="font-medium text-primary underline">
          Reintentar
        </button>
      </p>
    )
  }
  if ((lista.data?.items.length ?? 0) === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{vacio}</p>
  }
  return null
}

function Paginacion({ total, paginas }: { total: number; paginas: number }) {
  const search = comunicadosRoute.useSearch()
  const navigate = comunicadosRoute.useNavigate()
  const ir = (page: number) => void navigate({ search: (prev) => ({ ...prev, page }), replace: true })
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        {total} {total === 1 ? "comunicado" : "comunicados"}
      </span>
      {paginas > 1 && (
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            color="neutral"
            aria-label="Página anterior"
            disabled={search.page <= 0}
            onClick={() => ir(search.page - 1)}
          >
            <CaretLeftIcon aria-hidden />
          </Button>
          <span className="tabular-nums">
            {search.page + 1} / {paginas}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            color="neutral"
            aria-label="Página siguiente"
            disabled={search.page + 1 >= paginas}
            onClick={() => ir(search.page + 1)}
          >
            <CaretRightIcon aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}

const accion = (c: ComunicadoGestion): ComunicadoAccion => ({
  conversacionId: c.id,
  titulo: c.titulo,
  publicarEn: c.publicarEn,
})

/**
 * Publicados: la gestión del emisor (M.1.LIS.1), con el menú ⁞ de M.1.LIS.2 y M.1.LIS.3. Orden y
 * paginación en la URL (`sortBy`/`sortDir`/`page`/`pageSize`), resueltos por comms-service.
 */
function TablaPublicados() {
  const lista = useLista("PUBLICADOS")
  const paginacion = useTablePagination()
  const [dialogo, setDialogo] = useState<DialogoComunicado | null>(null)
  const filas = lista.data?.items ?? []
  const pageCount = lista.data?.pageCount ?? 0
  const totalCount = lista.data?.totalCount ?? 0

  const { table } = useDataTable({
    columns: createComunicadosColumns({ onDialogo: setDialogo }),
    data: filas,
    pageCount,
    getRowId: (c) => String(c.id),
    ...paginacion,
    columnVisibilityStorageKey: "comunicados-publicados-column-visibility",
  })

  return (
    <>
      {/* Móvil: tarjetas, para no desbordar con todas las columnas. */}
      <div className="md:hidden">
        {estadoLista({ lista, vacio: "No hay comunicados para mostrar." }) ?? (
          <ul className="flex flex-col gap-2">
            {filas.map((c) => (
              <li key={c.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={paths.app.comunicacionesComunicadoDetalle.getHref(c.id)}
                    className="min-w-0 font-medium break-words hover:underline"
                  >
                    {c.titulo}
                  </Link>
                  <MenuAccionesComunicado c={c} onDialogo={setDialogo} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {fecha(c.publicarEn)} · {c.publicadoPor} · {tiposAbreviados(c.tipos)} · {c.destinatarios ?? 0}{" "}
                  destinatarios
                </p>
                <div className="mt-1">
                  <EstadoComunicadoBadge estado={c.estado} />
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

      {dialogo?.tipo === "anular" && <AnularDialog comunicado={accion(dialogo.c)} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === "cancelar" && (
        <CancelarDialog comunicado={accion(dialogo.c)} onClose={() => setDialogo(null)} />
      )}
    </>
  )
}


/** Recibidos y Anteriores (M.1.REC.1): lista con punto de no leído y el comunicado al lado. */
function Bandeja({ pestana }: { pestana: PestanaComunicados }) {
  const lista = useLista(pestana)
  const [abierto, setAbierto] = useState<number | null>(null)
  const filas = lista.data?.items ?? []
  const estado = estadoLista({
    lista,
    vacio: pestana === "RECIBIDOS" ? "No tienes comunicados recibidos." : "No hay comunicados anteriores.",
  })
  const seleccionado = abierto ?? filas[0]?.id ?? null

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-w-0 flex-col gap-2">
        {estado ?? (
          <ul className="flex flex-col divide-y rounded-lg border" aria-label="Comunicados">
            {filas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setAbierto(c.id)}
                  aria-current={seleccionado === c.id}
                  className={cn(
                    "grid w-full grid-cols-[0.75rem_1fr_auto] items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                    seleccionado === c.id && "bg-muted",
                  )}
                >
                  <span
                    aria-label={c.leido ? undefined : "No leído"}
                    className={cn("size-2 rounded-full", !c.leido && "bg-primary")}
                  />
                  <span className="min-w-0">
                    <span className={cn("block truncate", !c.leido && "font-semibold")}>{c.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.publicadoPor}</span>
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{fecha(c.publicarEn)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {lista.data && <Paginacion total={lista.data.totalCount} paginas={lista.data.pageCount} />}
      </div>
      {seleccionado != null && <Lectura id={seleccionado} />}
    </div>
  )
}

/** Abrir el comunicado lo marca leído en comms-service: se refresca la lista para quitar el punto. */
function Lectura({ id }: { id: number }) {
  const queryClient = useQueryClient()
  const q = useComunicadoQuery(id)
  const cargado = q.isSuccess
  useEffect(() => {
    if (cargado) void queryClient.invalidateQueries({ queryKey: comunicadosGestionKey })
  }, [cargado, id, queryClient])

  if (q.isPending) return <Spinner className="m-6" />
  if (q.isError || !q.data) {
    return <p className="text-sm text-muted-foreground">{q.isError ? getErrorMessage(q.error) : "El comunicado no existe."}</p>
  }
  return <ComunicadoArticulo comunicado={q.data} />
}
