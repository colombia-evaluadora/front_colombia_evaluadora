"use no memo"

import { useState } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { toPageCount } from "@/lib/pagination"
import { listasValorRoute } from "@/router"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { CaretRightIcon, LockIcon, MagnifyingGlassIcon, TreeIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { cn } from "@/lib/utils"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useDeleteValor } from "@/features/administration/listas-valor/api/mutations/delete-valor"
import { useCategoriasQuery } from "@/features/administration/listas-valor/api/query/use-categorias-query"
import { useValoresQuery } from "@/features/administration/listas-valor/api/query/use-valores-query"
import type {
  Categoria,
  ListaValor,
} from "@/features/administration/listas-valor/api/types/lista-valor"
import { createValoresColumns } from "@/features/administration/listas-valor/components/columns-valores"
import { DialogModificarCategoria } from "@/features/administration/listas-valor/components/dialog-modificar-categoria"
import { DialogCreateCategoria } from "@/features/administration/listas-valor/components/dialog-create-categoria"
import { DialogSaveValor } from "@/features/administration/listas-valor/components/dialog-save-valor"

/** El `NoticeProvider` va afuera: `useNotify` lee el contexto de sus ancestros. */
export function ListasValorPage() {
  return (
    <NoticeProvider>
      <ListasValorPageContent />
    </NoticeProvider>
  )
}

const normalizar = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

/** Texto por el que se ordena cada columna. */
function valorOrdenable(valor: ListaValor, columna: string) {
  if (columna === "padre") return valor.padre?.nombre ?? ""
  if (columna === "valor") return valor.valor
  if (columna === "accion") return valor.accion ?? ""
  return valor.nombre
}

/** Cadena de listas de las que depende `categoria`, de la raíz hacia ella. */
function cadenaDePadres(categoria: string, categorias: Categoria[]) {
  const porNombre = new Map(categorias.map((c) => [c.categoria, c]))
  const cadena: string[] = []
  let actual = porNombre.get(categoria)?.categoriasPadre[0]
  // El corte por repetidos evita un bucle si la base llegara con un ciclo.
  while (actual && !cadena.includes(actual) && actual !== categoria) {
    cadena.unshift(actual)
    actual = porNombre.get(actual)?.categoriasPadre[0]
  }
  return cadena
}

function ListasValorPageContent() {
  const { notify } = useNotify()
  const permisos = useMenuPermission("LISTAS_VALOR")
  const [busquedaLista, setBusquedaLista] = useState("")
  // Lista elegida y búsqueda viven en la URL: el enlace abre la misma vista.
  const search = listasValorRoute.useSearch()
  const navigate = listasValorRoute.useNavigate()
  const busquedaValor = search.q ?? ""
  const paginacion = useTablePagination()

  const { data: categorias = [], isPending: categoriasPending, isError, error } =
    useCategoriasQuery()
  // Sin selección (o si la lista elegida dejó de existir) se muestra la primera.
  const categoria =
    categorias.find((c) => c.categoria === search.lista) ?? categorias[0] ?? null
  const {
    data: valores = [],
    isPending: valoresPending,
    isError: valoresError,
    error: valoresErr,
    refetch: refetchValores,
  } = useValoresQuery(categoria?.categoria ?? null)

  const listasFiltradas = categorias.filter((c) =>
    normalizar(c.categoria).includes(normalizar(busquedaLista)),
  )
  const valoresFiltrados = valores.filter((v) => {
    const q = normalizar(busquedaValor)
    return (
      normalizar(v.nombre).includes(q) ||
      normalizar(v.valor).includes(q) ||
      (v.padre && normalizar(v.padre.nombre).includes(q))
    )
  })

  // El endpoint trae la lista completa: orden y página se resuelven acá.
  const [orden] = paginacion.sorting
  const valoresOrdenados = orden
    ? [...valoresFiltrados].sort((a, b) => {
        const r = valorOrdenable(a, orden.id).localeCompare(valorOrdenable(b, orden.id), "es", {
          numeric: true,
        })
        return orden.desc ? -r : r
      })
    : valoresFiltrados
  const pageCount = toPageCount(valoresOrdenados.length, paginacion.pageSize)
  // Si la búsqueda o un borrado achican la lista, la página no queda fuera de rango.
  const pageIndex = Math.min(paginacion.pageIndex, Math.max(pageCount - 1, 0))
  const pagina = valoresOrdenados.slice(
    pageIndex * paginacion.pageSize,
    (pageIndex + 1) * paginacion.pageSize,
  )

  const cadena = categoria ? cadenaDePadres(categoria.categoria, categorias) : []
  const hijas = categoria
    ? categorias.filter((c) => c.categoriasPadre.includes(categoria.categoria))
    : []
  const tienePadre = (categoria?.categoriasPadre.length ?? 0) > 0

  function seleccionar(nombre: string | undefined) {
    navigate({
      search: (prev) => ({ ...prev, lista: nombre, q: undefined, page: 0, sortBy: undefined, sortDir: undefined }),
    })
  }

  function setBusquedaValor(q: string) {
    navigate({ search: (prev) => ({ ...prev, q: q || undefined, page: 0 }), replace: true })
  }

  const deleteValor = useDeleteValor()

  // `ConfirmRemoveButton` espera la promesa: el error se muestra en el aviso de la página.
  async function eliminarValor(valor: ListaValor) {
    try {
      await deleteValor.mutateAsync({ id: valor.pkListaValor })
      notify(SUCCESS_MESSAGES.listaValor.deleted)
    } catch (e) {
      notify(getErrorMessage(e), { variant: "error" })
    }
  }

  const columns = categoria
    ? createValoresColumns({
        categoria,
        categorias,
        puedeEditar: permisos.puedeEditar,
        puedeEliminar: permisos.puedeEliminar,
        onIrALista: seleccionar,
        onEliminar: eliminarValor,
      })
    : []

  const { table } = useDataTable({
    columns,
    data: pagina,
    pageCount,
    getRowId: (row) => String(row.pkListaValor),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "listas-valor-column-visibility",
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Listas de valor</TableScreenTitle>
      </TableScreenHeader>

      {/* El cuerpo estira su contenido hasta el borde inferior: así la línea del
          índice llega al final y no queda un hueco debajo. */}
      {/* Sin padding vertical en el cuerpo: lo pone cada columna, así la línea del índice
          toca el encabezado y el borde inferior. */}
      <TableScreenBody className="flex flex-col py-0 *:flex *:flex-1 *:flex-col">
        {/* Sin barra de herramientas, los avisos van al inicio del cuerpo. */}
        <NoticeOutlet className="mt-4" />
        {isError ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No se pudieron cargar las listas</EmptyTitle>
              <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid flex-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
            {/* Índice de listas */}
            {/* En desktop el índice queda pegado bajo el encabezado (header de la app 3.5rem +
                título ≈4rem) y mide hasta el borde inferior de la pantalla: sigue al
                scroll de la tabla y su lista (`h-0 flex-1`) scrollea adentro. */}
            <nav
              aria-label="Listas"
              className="flex flex-col gap-3 lg:sticky py-4 lg:top-[7.5rem] lg:h-[calc(100svh-8.5rem)] lg:self-start lg:border-r lg:border-border lg:pr-4"
            >
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Buscar lista"
                    placeholder="Buscar lista"
                    variant="outlined"
                    className="pl-9"
                    value={busquedaLista}
                    onChange={(e) => setBusquedaLista(e.target.value)}
                  />
                </div>
                {permisos.puedeCrear && (
                  <DialogCreateCategoria categorias={categorias} onCreated={seleccionar} />
                )}
              </div>
              {categoriasPending ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : listasFiltradas.length === 0 ? (
                <p className="px-2 py-4 text-muted-foreground">
                  {categorias.length === 0 ? "Aún no hay listas." : "Ninguna lista coincide."}
                </p>
              ) : (
                <ul className="flex max-h-[65vh] flex-col gap-0.5 overflow-y-auto lg:h-0 lg:max-h-none lg:min-h-48 lg:flex-1">
                  {listasFiltradas.map((c) => {
                    const activa = c.categoria === categoria?.categoria
                    return (
                      <li key={c.categoria}>
                        <button
                          type="button"
                          aria-current={activa ? "true" : undefined}
                          onClick={() => seleccionar(c.categoria)}
                          className={cn(
                            // Ring inset: el contenedor con scroll recorta el ring exterior.
                            "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
                            activa && "bg-primary/10 text-primary hover:bg-primary/15",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span className={cn("truncate font-mono text-[0.8125rem]", activa ? "font-semibold" : "font-medium")}>
                              {c.categoria}
                            </span>
                            {c.esSistema && (
                              <LockIcon
                                aria-label="Lista del sistema"
                                className={cn("size-3.5 shrink-0", !activa && "text-muted-foreground")}
                              />
                            )}
                            <span className={cn("ml-auto text-xs tabular-nums", !activa && "text-muted-foreground")}>
                              {c.totalValores}
                            </span>
                          </span>
                          {c.categoriasPadre.length > 0 && (
                            <span className="truncate text-xs text-muted-foreground">
                              Depende de {c.categoriasPadre.join(", ")}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </nav>

            {/* Detalle de la lista */}
            {categoria == null ? (
              categoriasPending ? (
                <Skeleton className="h-80" />
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Aún no hay listas</EmptyTitle>
                    <EmptyDescription>Agrega una lista para empezar a cargar valores.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            ) : (
              <section aria-labelledby="lista-actual" className="flex min-w-0 flex-col gap-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    {/* Jerarquía: las listas padre son navegables. */}
                    <ol className="flex flex-wrap items-center gap-1 font-mono text-sm">
                      {cadena.map((nombre) => (
                        <li key={nombre} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => seleccionar(nombre)}
                            className="rounded text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {nombre}
                          </button>
                          <CaretRightIcon aria-hidden className="size-4 text-muted-foreground" />
                        </li>
                      ))}
                      <li>
                        <h2 id="lista-actual" className="text-lg font-semibold">
                          {categoria.categoria}
                        </h2>
                      </li>
                    </ol>
                    {hijas.length > 0 && (
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <TreeIcon aria-hidden className="size-3.5" />
                        Listas que dependen de esta:
                        {hijas.map((h) => (
                          <button
                            key={h.categoria}
                            type="button"
                            onClick={() => seleccionar(h.categoria)}
                            className="rounded font-mono text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {h.categoria}
                          </button>
                        ))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(permisos.puedeEditar || permisos.puedeEliminar) && (
                      <DialogModificarCategoria
                        categoria={categoria}
                        categorias={categorias}
                        valores={valores}
                        puedeEditar={permisos.puedeEditar}
                        puedeEliminar={permisos.puedeEliminar}
                        onDeleted={() => seleccionar(undefined)}
                      />
                    )}
                    {permisos.puedeCrear && (
                      <DialogSaveValor
                        key={`nuevo-${categoria.categoria}`}
                        categoria={categoria}
                        categorias={categorias}
                      />
                    )}
                  </div>
                </div>

                <div className="relative max-w-sm">
                  <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Buscar valor"
                    placeholder={tienePadre ? "Buscar por nombre, código o padre" : "Buscar por nombre o código"}
                    variant="outlined"
                  className="pl-9"
                    value={busquedaValor}
                    onChange={(e) => setBusquedaValor(e.target.value)}
                  />
                </div>

                <DataTable
                  table={table}
                  isPending={valoresPending}
                  isError={valoresError}
                  onRetry={refetchValores}
                  errorMessage={valoresErr ? getErrorMessage(valoresErr) : undefined}
                  emptyMessage={
                    valores.length === 0
                      ? "Esta lista no tiene valores."
                      : "Ningún valor coincide con la búsqueda."
                  }
                />
                <Pagination
                  viewOptions={<DataTableViewOptions table={table} />}
                  pageIndex={pageIndex}
                  pageCount={pageCount}
                  canPrev={pageIndex > 0}
                  canNext={pageIndex < pageCount - 1}
                  onPageChange={paginacion.goToPage}
                  totalCount={valoresFiltrados.length}
                  pageSize={paginacion.pageSize}
                  onPageSizeChange={paginacion.setPageSize}
                />
              </section>
            )}
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
