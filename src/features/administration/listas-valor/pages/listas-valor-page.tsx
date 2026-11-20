"use no memo"

import { useState } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  CaretRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ControlPointIcon,
  DotsThreeVerticalIcon,
  InfoIcon,
  LockIcon,
  PencilIcon,
  ProhibitIcon,
  SpinnerIcon,
  TrashIcon,
  TreeIcon,
  XIcon,
} from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useArrastrarFilas } from "@/hooks/use-arrastrar-filas"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage, isConflictError } from "@/lib/api-client"
import { toPageCount } from "@/lib/pagination"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { cn } from "@/lib/utils"
import { listasValorRoute } from "@/router"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useDeleteCategoria } from "@/features/administration/listas-valor/api/mutations/delete-categoria"
import { useDeleteValor } from "@/features/administration/listas-valor/api/mutations/delete-valor"
import { useEstadoCategoria } from "@/features/administration/listas-valor/api/mutations/estado-categoria"
import { useEstadoValor } from "@/features/administration/listas-valor/api/mutations/estado-valor"
import { useOrdenarValores } from "@/features/administration/listas-valor/api/mutations/ordenar-valores"
import { usePredeterminadoValor } from "@/features/administration/listas-valor/api/mutations/predeterminado-valor"
import { useCategoriasQuery } from "@/features/administration/listas-valor/api/query/use-categorias-query"
import { useValoresQuery } from "@/features/administration/listas-valor/api/query/use-valores-query"
import type { Categoria, ListaValor } from "@/features/administration/listas-valor/api/types/lista-valor"
import { createValoresColumns } from "@/features/administration/listas-valor/components/columns-valores"
import { DialogBloqueo, type Bloqueo } from "@/features/administration/listas-valor/components/dialog-bloqueo"
import { DialogLista } from "@/features/administration/listas-valor/components/dialog-lista"
import { DialogSaveValor } from "@/features/administration/listas-valor/components/dialog-save-valor"
import { IconografiaPanel } from "@/features/administration/listas-valor/components/iconografia-panel"

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
  if (columna === "orden") return String(valor.orden)
  if (columna === "padre") return valor.padre?.nombre ?? ""
  if (columna === "valor") return valor.valor
  if (columna === "etiqueta") return valor.etiqueta ?? ""
  if (columna === "habilitado") return valor.habilitado ? "0" : "1"
  return valor.nombre
}

/** Cadena de listas de las que depende `categoria`, de la raíz hacia ella. */
function cadenaDePadres(categoria: string, categorias: Categoria[]) {
  const porCodigo = new Map(categorias.map((c) => [c.categoria, c]))
  const cadena: Categoria[] = []
  let actual = porCodigo.get(categoria)?.categoriaPadre
  // El corte por repetidos evita un bucle si la base llegara con un ciclo.
  while (actual && !cadena.some((c) => c.categoria === actual) && actual !== categoria) {
    const padre = porCodigo.get(actual)
    if (!padre) break
    cadena.unshift(padre)
    actual = padre.categoriaPadre
  }
  return cadena
}

/** «Cobertura Educativa y Gestión Académica»: módulos (primer tramo) de los campos que usan la lista. */
function modulosQueUsan(campos: string[]) {
  const modulos = [...new Set(campos.map((c) => c.split(" · ")[0]))]
  return modulos.length > 1 ? `${modulos.slice(0, -1).join(", ")} y ${modulos.at(-1)}` : (modulos[0] ?? "")
}

function ListasValorPageContent() {
  const { notify } = useNotify()
  const permisos = useMenuPermission("LISTAS_VALOR")
  const [busquedaLista, setBusquedaLista] = useState("")
  // Lista elegida y búsqueda viven en la URL: el enlace abre la misma vista.
  const search = listasValorRoute.useSearch()
  const navigate = listasValorRoute.useNavigate()
  const busquedaValor = search.q ?? ""
  const pestana = search.pestana ?? "listas"

  // Diálogos: se montan al abrir, así arrancan con los datos del momento.
  const [dialogValor, setDialogValor] = useState<{ valor?: ListaValor } | null>(null)
  const [dialogLista, setDialogLista] = useState<{ categoria?: Categoria } | null>(null)
  const [bloqueo, setBloqueo] = useState<Bloqueo | null>(null)
  const [eliminandoValor, setEliminandoValor] = useState<ListaValor | null>(null)
  const [eliminandoLista, setEliminandoLista] = useState<Categoria | null>(null)

  function cambiarPestana(next: string) {
    navigate({
      search: (prev) => ({ ...prev, pestana: next === "iconografia" ? "iconografia" : undefined }),
    })
  }
  const paginacion = useTablePagination()

  const { data: categorias = [], isPending: categoriasPending, isError, error } = useCategoriasQuery()
  // Sin selección (o si la lista elegida dejó de existir) se muestra la primera.
  const categoria = categorias.find((c) => c.categoria === search.lista) ?? categorias[0] ?? null
  const {
    data: valores = [],
    isPending: valoresPending,
    isError: valoresError,
    error: valoresErr,
    refetch: refetchValores,
  } = useValoresQuery(categoria?.categoria ?? null)

  const nombreDe = (codigo: string | null) =>
    codigo ? (categorias.find((c) => c.categoria === codigo)?.nombre ?? codigo) : ""

  const qLista = normalizar(busquedaLista)
  const listasFiltradas = categorias.filter(
    (c) =>
      normalizar(c.nombre).includes(qLista) ||
      normalizar(c.categoria).includes(qLista.replace(/\s+/g, "_")) ||
      normalizar(c.descripcion ?? "").includes(qLista),
  )
  // Mientras se arrastra la tabla muestra el orden local; al soltar se guarda.
  const [ordenLocal, setOrdenLocal] = useState<ListaValor[] | null>(null)
  const valoresBase = ordenLocal ?? valores
  const valoresFiltrados = valoresBase.filter((v) => {
    const q = normalizar(busquedaValor)
    return (
      normalizar(v.nombre).includes(q) ||
      normalizar(v.valor).includes(q) ||
      normalizar(v.etiqueta ?? "").includes(q) ||
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
  const pagina = valoresOrdenados.slice(pageIndex * paginacion.pageSize, (pageIndex + 1) * paginacion.pageSize)

  const onError = (err: unknown) => notify(getErrorMessage(err), { variant: "error" })

  const ordenarValores = useOrdenarValores({
    mutationConfig: {
      onSuccess: () => notify("El orden de los valores se actualizó correctamente."),
      onError,
      onSettled: () => setOrdenLocal(null),
    },
  })
  const ordenable =
    permisos.puedeEditar && !orden && !busquedaValor && valores.length > 1 && !ordenarValores.isPending

  function moverA(pk: number, destino: number) {
    setOrdenLocal((prev) => {
      const lista = prev ?? valores
      const desde = lista.findIndex((v) => v.pkListaValor === pk)
      if (desde < 0 || destino < 0 || destino >= lista.length || desde === destino) return prev
      const next = [...lista]
      const [item] = next.splice(desde, 1)
      next.splice(destino, 0, item)
      return next
    })
  }

  function guardarOrden(lista = ordenLocal) {
    if (!categoria || !lista) return
    const cambio = lista.some((v, i) => v.pkListaValor !== valores[i]?.pkListaValor)
    if (!cambio) {
      setOrdenLocal(null)
      return
    }
    setOrdenLocal(lista)
    ordenarValores.mutate({ categoria: categoria.categoria, orden: lista.map((v) => v.pkListaValor) })
  }

  // Los índices del arrastre son de la página: se llevan a la lista completa.
  const asa = useArrastrarFilas((desde, hasta) => {
    const offset = pageIndex * paginacion.pageSize
    const next = [...valoresBase]
    const [item] = next.splice(offset + desde, 1)
    next.splice(offset + hasta, 0, item)
    guardarOrden(next)
  })

  const cadena = categoria ? cadenaDePadres(categoria.categoria, categorias) : []
  const hijas = categoria ? categorias.filter((c) => c.categoriaPadre === categoria.categoria) : []
  const tienePadre = categoria?.categoriaPadre != null

  function seleccionar(codigo: string | undefined) {
    navigate({
      search: (prev) => ({ ...prev, lista: codigo, q: undefined, page: 0, sortBy: undefined, sortDir: undefined }),
    })
  }

  function setBusquedaValor(q: string) {
    navigate({ search: (prev) => ({ ...prev, q: q || undefined, page: 0 }), replace: true })
  }

  // Acciones del menú ⁞ de un valor: se aplican al instante; el error va al aviso de la página.
  const [pendiente, setPendiente] = useState<number | null>(null)
  const onSettled = () => setPendiente(null)
  const predeterminado = usePredeterminadoValor({
    mutationConfig: {
      onSuccess: (v) =>
        notify(v.predeterminado ? `«${v.nombre}» quedó como valor predeterminado.` : "La lista quedó sin valor predeterminado."),
      onError,
      onSettled,
    },
  })
  const estadoValor = useEstadoValor({
    mutationConfig: {
      onSuccess: (v) =>
        notify(v.habilitado ? SUCCESS_MESSAGES.listaValor.activated : SUCCESS_MESSAGES.listaValor.deactivated),
      onError: (err, { id }) => {
        // S.1.VAL.LST.5: un valor padre con hijos activos no se inactiva.
        const v = valores.find((x) => x.pkListaValor === id)
        if (isConflictError(err) && v && hijas.length) {
          setBloqueo({
            titulo: `No se puede inactivar ${v.nombre}`,
            mensaje: (
              <>
                No se puede inactivar <strong>{v.nombre}</strong> porque tiene valores activos en la lista{" "}
                <strong>{hijas[0].nombre}</strong>. Inactívelos primero.
              </>
            ),
          })
          return
        }
        onError(err)
      },
      onSettled,
    },
  })

  const deleteValor = useDeleteValor({
    mutationConfig: {
      onSuccess: () => {
        setEliminandoValor(null)
        notify(SUCCESS_MESSAGES.listaValor.deleted)
      },
      onError: (err) => {
        setEliminandoValor(null)
        onError(err)
      },
    },
  })

  // Menú de la lista (S.1.LIS.LST.1).
  const estadoLista = useEstadoCategoria({
    mutationConfig: {
      onSuccess: (c) =>
        notify(c.habilitada ? SUCCESS_MESSAGES.listaValorCategoria.activated : SUCCESS_MESSAGES.listaValorCategoria.deactivated),
      onError,
    },
  })
  const deleteLista = useDeleteCategoria({
    mutationConfig: {
      onSuccess: () => {
        setEliminandoLista(null)
        notify(SUCCESS_MESSAGES.listaValorCategoria.deleted)
        seleccionar(undefined)
      },
      onError: (err) => {
        setEliminandoLista(null)
        onError(err)
      },
    },
  })

  function bloqueoLista(c: Categoria): Bloqueo {
    return {
      titulo: `No se puede inactivar la lista ${c.nombre}`,
      mensaje: (
        <>
          No se puede inactivar la lista <strong>{c.nombre}</strong> porque la usan estos campos:
        </>
      ),
      items: c.camposQueUsan,
    }
  }

  const columns = categoria
    ? createValoresColumns({
        categoria,
        conEtiqueta: valores.some((v) => v.etiqueta),
        puedeEditar: permisos.puedeEditar,
        puedeEliminar: permisos.puedeEliminar,
        pendiente,
        onIrALista: seleccionar,
        onModificar: (v) => setDialogValor({ valor: v }),
        onPredeterminado: (v, marcar) => {
          setPendiente(v.pkListaValor)
          predeterminado.mutate({ id: v.pkListaValor, predeterminado: marcar })
        },
        onEstado: (v, habilitado) => {
          setPendiente(v.pkListaValor)
          estadoValor.mutate({ id: v.pkListaValor, habilitado })
        },
        onEliminar: setEliminandoValor,
        ordenable,
        offset: pageIndex * paginacion.pageSize,
        asa,
        onMover: (v, delta) => {
          const desde = valoresBase.findIndex((x) => x.pkListaValor === v.pkListaValor)
          moverA(v.pkListaValor, desde + delta)
          // El asa sigue al valor: con getRowId la fila se reutiliza, pero por si cambia de página.
          requestAnimationFrame(() =>
            document.querySelector<HTMLElement>(`[data-orden-asa="${v.pkListaValor}"]`)?.focus(),
          )
        },
        onSoltar: () => guardarOrden(),
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

  // Una lista que usan campos del sistema no se inactiva ni se elimina (LIS.1); las del sistema tampoco se eliminan.
  const usadaPorCampos = Boolean(categoria?.camposQueUsan?.length)
  const notaMenuLista = !categoria
    ? ""
    : usadaPorCampos
      ? `La usan selectores de ${modulosQueUsan(categoria.camposQueUsan ?? [])}: no se puede eliminar ni inactivar.`
      : categoria.esSistema
        ? "Lista del sistema: se puede inactivar, pero no eliminar."
        : "Eliminar solo si ningún registro usa sus valores; si no, inactívela."

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Lista de valores</TableScreenTitle>
      </TableScreenHeader>
      <TableScreenTabs className="bg-card">
        <Tabs value={pestana} onValueChange={(v) => cambiarPestana(String(v))}>
          <TabsList className="border-b-0">
            <TabsTrigger value="listas">Listas</TabsTrigger>
            <TabsTrigger value="iconografia">Iconografía</TabsTrigger>
          </TabsList>
        </Tabs>
      </TableScreenTabs>

      {pestana === "iconografia" ? (
        <TableScreenBody>
          <NoticeOutlet className="mt-4" />
          <IconografiaPanel
            puedeEditar={permisos.puedeEditar}
            puedeEliminar={permisos.puedeEliminar}
            puedeCrear={permisos.puedeCrear}
          />
        </TableScreenBody>
      ) : (
        // Cuerpo sin padding vertical y estirado hasta el borde: la línea del índice
        // toca el encabezado y el borde inferior.
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
            <div className="grid flex-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
              {/* Panel de listas (maestro). En desktop queda pegado bajo el encabezado y su
                  lista (`h-0 flex-1`) scrollea adentro. */}
              <nav
                aria-label="Listas"
                className="flex flex-col gap-3 py-4 lg:sticky lg:top-[7.5rem] lg:h-[calc(100svh-8.5rem)] lg:self-start lg:border-r lg:border-border lg:pr-4"
              >
                {/* Buscador y «Nueva lista» en la misma línea; el botón azul va al final. */}
                <div className="flex items-end gap-2">
                  <SearchQueryBar
                    id="listas-search"
                    placeholder="Buscar lista"
                    className="min-w-0 flex-1"
                    value={busquedaLista}
                    onValueChange={setBusquedaLista}
                    onClearAll={() => setBusquedaLista("")}
                    activeFilterCount={busquedaLista ? 1 : 0}
                  />
                  {permisos.puedeCrear && (
                    <Button size="sm" color="primary" className="shrink-0" onClick={() => setDialogLista({})}>
                      <ControlPointIcon data-icon="inline-start" />
                      Nueva lista
                    </Button>
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
                  <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border lg:h-0 lg:min-h-48 lg:flex-1">
                    {/* Encabezado de la tabla de listas: Lista · Estado. */}
                    <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm font-medium">
                      <span>Lista</span>
                      <span>Estado</span>
                    </div>
                    <ul className="flex max-h-[65vh] flex-col overflow-y-auto lg:max-h-none lg:flex-1">
                      {listasFiltradas.map((c) => {
                        const activa = c.categoria === categoria?.categoria
                        return (
                          <li key={c.categoria} className="border-b border-border last:border-b-0">
                            <button
                              type="button"
                              aria-current={activa ? "true" : undefined}
                              onClick={() => seleccionar(c.categoria)}
                              className={cn(
                                // Ring inset: el contenedor con scroll recorta el ring exterior.
                                "flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none hover:bg-primary-22 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
                                activa && "bg-primary-22",
                                !c.habilitada && "opacity-55",
                              )}
                            >
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "truncate text-sm",
                                      activa ? "font-semibold text-primary" : "font-medium",
                                    )}
                                  >
                                    {c.nombre}
                                  </span>
                                  {c.esSistema && (
                                    <LockIcon aria-label="Lista del sistema" className="size-3.5 shrink-0 text-muted-foreground" />
                                  )}
                                </span>
                                {c.categoriaPadre && (
                                  <span className="truncate text-xs text-muted-foreground">
                                    Lista padre: {nombreDe(c.categoriaPadre)}
                                  </span>
                                )}
                              </span>
                              <Badge variant="soft" color={c.habilitada ? "success" : "neutral"}>
                                {c.habilitada ? "Activa" : "Inactiva"}
                              </Badge>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                    <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                      {listasFiltradas.length === categorias.length
                        ? `${categorias.length} listas`
                        : `${listasFiltradas.length} de ${categorias.length} listas`}
                    </p>
                  </div>
                )}
              </nav>

              {/* Valores de la lista (detalle) */}
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
                      <ol className="flex flex-wrap items-center gap-1">
                        {cadena.map((padre) => (
                          <li key={padre.categoria} className="flex items-center gap-1 text-sm">
                            <button
                              type="button"
                              onClick={() => seleccionar(padre.categoria)}
                              className="rounded text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              {padre.nombre}
                            </button>
                            <CaretRightIcon aria-hidden className="size-4 text-muted-foreground" />
                          </li>
                        ))}
                        <li>
                          <h2 id="lista-actual" className="text-lg font-semibold">
                            Valores de «{categoria.nombre}»
                          </h2>
                        </li>
                      </ol>
                      {categoria.descripcion && (
                        <p className="max-w-prose text-sm text-muted-foreground">{categoria.descripcion}</p>
                      )}
                      {/* «Usada en» (pendiente de backend: sin el dato no se muestra). */}
                      {categoria.usadaEn?.length ? (
                        <p className="max-w-prose text-sm">
                          <span className="font-medium">Usada en: </span>
                          <span className="text-muted-foreground">{categoria.usadaEn.join("; ")}.</span>
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 pt-1 empty:hidden">
                        {!categoria.habilitada && (
                          <Badge variant="outline" color="neutral">
                            Inactiva: sus valores no salen en los formularios
                          </Badge>
                        )}
                        {categoria.esOrdinal && (
                          <Badge variant="soft" color="info">
                            Ordinal
                          </Badge>
                        )}
                      </div>
                      {hijas.length > 0 && (
                        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <TreeIcon aria-hidden className="size-3.5" />
                          Listas que dependen de esta:
                          {hijas.map((h) => (
                            <button
                              key={h.categoria}
                              type="button"
                              onClick={() => seleccionar(h.categoria)}
                              className="rounded text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              {h.nombre}
                            </button>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Línea de herramientas como en el resto del proyecto: buscador a la izquierda, acciones a la derecha. */}
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <SearchQueryBar
                      id="valores-search"
                      placeholder={tienePadre ? "Buscar por nombre, código o padre" : "Buscar por nombre o código"}
                      value={busquedaValor}
                      onValueChange={setBusquedaValor}
                      onClearAll={() => setBusquedaValor("")}
                      activeFilterCount={busquedaValor ? 1 : 0}
                    />
                    <div className="flex items-center gap-2">
                      {permisos.puedeEditar && (
                        <Button
                          size="sm"
                          variant="outline"
                          color="neutral"
                          onClick={() => setDialogLista({ categoria })}
                        >
                          <PencilIcon data-icon="inline-start" />
                          Modificar lista
                        </Button>
                      )}
                      {(permisos.puedeEditar || permisos.puedeEliminar) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="outline"
                                color="neutral"
                                size="icon"
                                aria-label={`Acciones de la lista ${categoria.nombre}`}
                                disabled={estadoLista.isPending}
                              />
                            }
                          >
                            <DotsThreeVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-72">
                            {permisos.puedeEditar && (
                              <DropdownMenuItem
                                disabled={categoria.habilitada && usadaPorCampos}
                                onClick={() =>
                                  estadoLista.mutate({
                                    categoria: categoria.categoria,
                                    habilitada: !categoria.habilitada,
                                  })
                                }
                              >
                                {categoria.habilitada ? <ProhibitIcon /> : <CheckCircleIcon />}
                                {categoria.habilitada ? "Inactivar" : "Activar"}
                              </DropdownMenuItem>
                            )}
                            {permisos.puedeEliminar && (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={usadaPorCampos || categoria.esSistema}
                                onClick={() => setEliminandoLista(categoria)}
                              >
                                <TrashIcon />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <p className="flex gap-1.5 px-2 py-1.5 text-xs text-muted-foreground">
                              <InfoIcon aria-hidden className="mt-px size-3.5 shrink-0" />
                              {notaMenuLista}
                            </p>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {/* El botón primario va siempre al final del grupo. */}
                      {permisos.puedeCrear && (
                        <Button size="sm" color="primary" onClick={() => setDialogValor({})}>
                          <ControlPointIcon data-icon="inline-start" />
                          Nuevo valor
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* La fila que se arrastra flota sobre las demás. */}
                  <div className="contents [&_tr[data-arrastrando]]:relative [&_tr[data-arrastrando]]:z-10 [&_tr[data-arrastrando]]:bg-card [&_tr[data-arrastrando]]:shadow-lg [&_tr[data-arrastrando]]:select-none">
                    <DataTable
                      table={table}
                      isPending={valoresPending}
                      // Inactivo: la fila al 55%; los iconos de acción quedan al 100% (DataTable).
                      isRowMuted={(row) => !(row.original as ListaValor).habilitado}
                      isError={valoresError}
                      onRetry={refetchValores}
                      errorMessage={valoresErr ? getErrorMessage(valoresErr) : undefined}
                      emptyMessage={
                        valores.length === 0 ? "Esta lista no tiene valores." : "Ningún valor coincide con la búsqueda."
                      }
                    />
                  </div>
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
      )}

      {dialogValor && categoria && (
        <DialogSaveValor
          categoria={categoria}
          valor={dialogValor.valor}
          valores={valores}
          nombreListaPadre={categoria.categoriaPadre ? nombreDe(categoria.categoriaPadre) : undefined}
          onClose={() => setDialogValor(null)}
        />
      )}
      {dialogLista && (
        <DialogLista
          categoria={dialogLista.categoria}
          categorias={categorias}
          onClose={() => setDialogLista(null)}
          onCreated={seleccionar}
          onBloqueoInactivar={(c) => setBloqueo(bloqueoLista(c))}
        />
      )}
      <DialogBloqueo bloqueo={bloqueo} onClose={() => setBloqueo(null)} />

      <AlertDialog open={eliminandoValor != null} onOpenChange={(open) => !open && setEliminandoValor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar valor</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar «{eliminandoValor?.nombre}» de la lista? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" color="neutral">
              <XIcon data-icon="inline-start" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={deleteValor.isPending}
              onClick={() => eliminandoValor && deleteValor.mutate({ id: eliminandoValor.pkListaValor })}
            >
              {deleteValor.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <TrashIcon data-icon="inline-start" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={eliminandoLista != null} onOpenChange={(open) => !open && setEliminandoLista(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar lista</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán los {eliminandoLista?.totalValores} valores de {eliminandoLista?.nombre}. No se puede si
              alguno está en uso o si otra lista depende de ella; en esos casos, inactívela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" color="neutral">
              <XIcon data-icon="inline-start" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={deleteLista.isPending}
              onClick={() => eliminandoLista && deleteLista.mutate({ categoria: eliminandoLista.categoria })}
            >
              {deleteLista.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableScreen>
  )
}
