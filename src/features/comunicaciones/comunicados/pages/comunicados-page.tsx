import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { CaretLeftIcon, CaretRightIcon, ControlPointIcon, DotsThreeVerticalIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
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
  type PestanaComunicados,
} from "@/features/comunicaciones/comunicados/api/comunicados-gestion"
import { tiposAbreviados, tiposCompletos } from "@/features/comunicaciones/comunicados/lib/tipos-destinatario"

const ESTADOS: { valor: EstadoComunicado; etiqueta: string }[] = [
  { valor: "PUBLICADO", etiqueta: "Publicado" },
  { valor: "PROGRAMADO", etiqueta: "Programado" },
  { valor: "VENCIDO", etiqueta: "Vencido" },
  { valor: "CANCELADO", etiqueta: "Cancelado" },
  { valor: "ANULADO", etiqueta: "Anulado" },
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
    <div className="flex min-w-0 flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Comunicados institucionales</h1>
        {publica && (
          <Button render={<Link to={paths.app.comunicacionesComunicadoNuevo.getHref()} />} nativeButton={false}>
            <ControlPointIcon data-icon="inline-start" aria-hidden />
            Nuevo comunicado
          </Button>
        )}
      </header>

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

      <NoticeOutlet />

      {gestion ? (
        <Filtros
          q={search.q ?? ""}
          estado={search.estado}
          desde={search.desde}
          onCambiar={cambiar}
          onLimpiar={() =>
            void navigate({ search: { pestana, page: 0, pageSize: search.pageSize }, replace: true })
          }
        />
      ) : (
        <Field className="max-w-sm">
          <FieldLabel htmlFor="comunicados-q">Buscar por título</FieldLabel>
          <Input
            id="comunicados-q"
            value={search.q ?? ""}
            onChange={(e) => cambiar({ q: e.target.value || undefined })}
          />
        </Field>
      )}

      {gestion ? <TablaPublicados /> : <Bandeja pestana={pestana} />}
    </div>
  )
}

function Filtros({
  q,
  estado,
  desde,
  onCambiar,
  onLimpiar,
}: {
  q: string
  estado?: EstadoComunicado
  desde?: string
  onCambiar: (c: { q?: string; estado?: EstadoComunicado; desde?: string }) => void
  onLimpiar: () => void
}) {
  const hayFiltros = !!(q || estado || desde)
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
      <Field>
        <FieldLabel htmlFor="comunicados-q">Buscar por título</FieldLabel>
        <Input id="comunicados-q" value={q} onChange={(e) => onCambiar({ q: e.target.value || undefined })} />
      </Field>
      <Field>
        <FieldLabel htmlFor="comunicados-estado">Estado</FieldLabel>
        <NativeSelect
          id="comunicados-estado"
          value={estado ?? ""}
          onChange={(e) => onCambiar({ estado: (e.target.value || undefined) as EstadoComunicado | undefined })}
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
        <Input
          id="comunicados-desde"
          type="date"
          value={desde ?? ""}
          onChange={(e) => onCambiar({ desde: e.target.value || undefined })}
        />
      </Field>
      <Button variant="ghost" color="neutral" disabled={!hayFiltros} onClick={onLimpiar}>
        Limpiar filtros
      </Button>
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

/** Publicados: la gestión del emisor (M.1.LIS.1), con el menú ⁞ de M.1.LIS.2 y M.1.LIS.3. */
function TablaPublicados() {
  const lista = useLista("PUBLICADOS")
  const [dialogo, setDialogo] = useState<{ tipo: "anular" | "cancelar"; c: ComunicadoGestion } | null>(null)
  const filas = lista.data?.items ?? []
  const estado = estadoLista({ lista, vacio: "No hay comunicados para mostrar." })

  return (
    <>
      {estado ?? (
        <>
          {/* Móvil: tarjetas, para no desbordar con todas las columnas. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filas.map((c) => (
              <li key={c.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium break-words">{c.titulo}</p>
                  <MenuAcciones c={c} onDialogo={setDialogo} />
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
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Publicado por</TableHead>
                  <TableHead>Tipos</TableHead>
                  <TableHead className="text-right">Destinatarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{fecha(c.publicarEn)}</TableCell>
                    <TableCell className="max-w-72 truncate" title={c.titulo}>
                      {c.titulo}
                    </TableCell>
                    <TableCell>{c.publicadoPor}</TableCell>
                    <TableCell title={tiposCompletos(c.tipos)}>{tiposAbreviados(c.tipos)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(c.destinatarios ?? 0).toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell>
                      <EstadoComunicadoBadge estado={c.estado} />
                    </TableCell>
                    <TableCell>
                      <MenuAcciones c={c} onDialogo={setDialogo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      {lista.data && <Paginacion total={lista.data.totalCount} paginas={lista.data.pageCount} />}

      {dialogo?.tipo === "anular" && <AnularDialog comunicado={accion(dialogo.c)} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === "cancelar" && (
        <CancelarDialog comunicado={accion(dialogo.c)} onClose={() => setDialogo(null)} />
      )}
    </>
  )
}

function MenuAcciones({
  c,
  onDialogo,
}: {
  c: ComunicadoGestion
  onDialogo: (d: { tipo: "anular" | "cancelar"; c: ComunicadoGestion }) => void
}) {
  const vigente = c.estado === "PUBLICADO" || c.estado === "PROGRAMADO"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Opciones de ${c.titulo}`}
        className="grid size-8 place-items-center rounded-md hover:bg-muted"
      >
        <DotsThreeVerticalIcon className="size-4.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link to={paths.app.comunicacionesComunicadoDetalle.getHref(c.id)} />}
          nativeButton={false}
        >
          Ver detalle
        </DropdownMenuItem>
        {/* Modificar solo lo ofrece al autor (M.1.LIS.2). */}
        {c.esAutor && vigente && (
          <DropdownMenuItem
            render={<Link to={paths.app.comunicacionesComunicadoEditar.getHref(c.id)} />}
            nativeButton={false}
          >
            Modificar
          </DropdownMenuItem>
        )}
        {c.estado === "PROGRAMADO" && (
          <DropdownMenuItem onClick={() => onDialogo({ tipo: "cancelar", c })}>Cancelar comunicado</DropdownMenuItem>
        )}
        {c.estado === "PUBLICADO" && (
          <DropdownMenuItem variant="destructive" onClick={() => onDialogo({ tipo: "anular", c })}>
            Anular
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
