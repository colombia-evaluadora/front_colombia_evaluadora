import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { PendingCreations } from "@/features/planeador/components/pending-creations"

import { PrepareOfflineButton } from "@/components/offline/prepare-offline-dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { PlusCircleIcon, DotsThreeIcon, CaretLeftIcon, CaretRightIcon } from "@/components/ui/icons"
import { LoadingLabel } from "@/components/offline/loading-label"

import { useActividadesStatsQuery } from "@/features/planeador/api/query/use-actividades-stats-query"
import { useActividadesCalendarioQuery } from "@/features/planeador/api/query/use-actividades-calendario-query"
import {
  fetchTodasLasActividadesMias,
  useActividadesMiasQuery,
} from "@/features/planeador/api/query/use-actividades-mias-query"
import { parToString, useActividadesTabsQuery } from "@/features/planeador/api/query/use-actividades-tabs-query"
import { useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { resolverRotuloUnidad } from "@/features/planeador/lib/unidad-instrumento-label"
import { useInstrumentoFiltroOptions } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import { useExportarActividadesJson } from "@/features/planeador/api/mutations/exportar-actividades-json"
import { ActividadCard } from "@/features/planeador/components/actividad-card"
import { ActividadDetallePanel } from "@/features/planeador/components/actividad-detalle-panel"
import { prefetchActividadDetalle } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { DialogExportActividades } from "@/features/planeador/components/dialogs/dialog-export-actividades"
import { DialogImportarActividadesJson } from "@/features/planeador/components/dialogs/dialog-importar-actividades-json"
import { downloadJson } from "@/features/planeador/lib/download-json"
import { PlaneadorSummaryCards } from "@/features/planeador/components/planeador-summary-cards"
import {
  PlaneadorMonthGrid,
  type DayEvent,
} from "@/features/planeador/components/planeador-month-grid"
import { PlaneadorTabs } from "@/features/planeador/components/planeador-tabs"
import { SearchPlaneador } from "@/features/planeador/components/search/search-planeador"
import { usePlaneadorFilters } from "@/features/planeador/hooks/use-planeador-filters"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnFrase,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { concordanciaRotulo } from "@/features/planeador/lib/rotulo-gramatica"
import { statusToEstadoDerivado } from "@/features/planeador/lib/estado-derivado"
import type { ActividadStatus } from "@/features/planeador/api/types/actividad"

import { planeadorRoute } from "@/router"
import { paths } from "@/config/paths"
import {
  PlaneadorSoloLecturaScope,
  usePlaneadorSoloLectura,
} from "@/features/planeador/hooks/use-planeador-solo-lectura"
import { usePlaneadorDocenteScope } from "@/features/planeador/hooks/use-planeador-docente-scope"
import {
  PlaneadorLecturaBanner,
} from "@/features/planeador/components/planeador-docente-selector"
import { esAjena } from "@/features/planeador/lib/docente-dueno"
import { useNotificarErrores } from "@/features/planeador/hooks/use-notificar-errores"
import {
  formatDate,
  parseLocalDate,
  toDateOnly,
  todayDateOnly,
} from "@/features/planeador/lib/format-date"
import { getErrorMessage } from "@/lib/api-client"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { DatosDelBadge } from "@/components/offline/datos-del-badge"
import { TTL_OFFLINE } from "@/lib/offline/query-meta"

/** Página del Planeador: rail + calendario; el estado vive en la URL salvo `displayMonth` (no vale persistirlo). */
export function PlaneadorPage() {
  return (
    <NoticeProvider>
      <PlaneadorPageContent />
    </NoticeProvider>
  )
}

function PlaneadorPageContent() {
  const soloEnLinea = useOnlineOnly()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const search = useSearch({ from: planeadorRoute.id })
  const { notify } = useNotify()
  const { puedeCrear, viendoOtroDocente } = usePlaneadorSoloLectura()
  // Alcance del filtro avanzado; los hooks ya lo leen de la URL (`usePlaneadorDocenteScope`).
  const scope = usePlaneadorDocenteScope()
  // Nombre del docente solo si la vista mezcla varios (Coordinador, toda la sede).
  const mostrarDocente = scope.puedeElegirDocente && scope.funcionario == null

  // Cambiar el alcance borra la pestaña y la actividad abierta (eran del alcance anterior).
  const { filters, applyFilters, clearAllFilters, activeFilterCount } =
    usePlaneadorFilters()
  const buscar = filters.buscar
  const estado = filters.estado
  // `filtro` = `pk_lista_valor` del instrumento (ver `useInstrumentoFiltroOptions`).
  const instrumento = filters.filtro && Number.isFinite(Number(filters.filtro)) ? Number(filters.filtro) : undefined
  const estadosQuery = estado ? statusToEstadoDerivado(estado as ActividadStatus) : undefined
  // `undefined` => se muestra el calendario.
  const actividadId = search.actividad ?? undefined
  // Cambiar de actividad resetea `modo` (vive suelto en la URL); `setMode` lo pisa en el mismo navigate.
  const setActividadId = (next: string | undefined) =>
    navigate({
      to: planeadorRoute.id,
      search: (prev) => ({ ...prev, actividad: next, modo: undefined }),
      replace: true,
    })

  // Día activo del rail (`?dia=`, paginado de `/actividades/mias`); ausente == hoy.
  const dia = search.dia ?? todayDateOnly()
  const setDia = (next: string) =>
    navigate({
      to: planeadorRoute.id,
      search: (prev) => ({ ...prev, dia: next }),
      replace: true,
    })

  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )

  // `?modo=` en la URL: enlazable y sobrevive al refresh; ausente == "info".
  const panelMode: "info" | "grades" | "approval" = search.modo ?? "info"

  // Mismo comportamiento desde la card y desde el header del panel.
  function setMode(actividadId: string, mode: "grades" | "approval") {
    navigate({
      to: planeadorRoute.id,
      search: (prev) => ({ ...prev, actividad: actividadId, modo: mode }),
      replace: true,
    })
  }

  // Catálogo `INSTRUMENTO_EVALUACION` para el filtro "Instrumento".
  const { data: instrumentoOptions = [] } = useInstrumentoFiltroOptions()

  const mesDesde = toDateOnly(new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1))
  const mesHasta = toDateOnly(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0))

  // `?rotulo=` siempre se resuelve: un único rótulo no cubre todo el catálogo del docente.
  const { data: actividadTabs = [], error: errorTabs } = useActividadesTabsQuery()
  const tabActiva = actividadTabs.find((t) => t.rotulo === search.rotulo) ?? actividadTabs[0]

  // 3 endpoints reales en vez de traer todo con `size=500` y derivar en el cliente.
  const { data: statsCounts, error: errorStats } = useActividadesStatsQuery({
    search: buscar || undefined,
    instrumento,
    gradoAsignaturaPares: tabActiva?.pares,
  })

  // Con un "Estado" elegido las demás tarjetas van en 0 (no se manda `estados` a `/stats`).
  const conteosBase = statsCounts ?? { pending: 0, "in-progress": 0, completed: 0, cancelled: 0 }
  const conteosVisibles = estado
    ? (Object.fromEntries(
        Object.entries(conteosBase).map(([k, v]) => [k, k === estado ? v : 0]),
      ) as typeof conteosBase)
    : conteosBase

  const { data: calendarioActividades = [], error: errorCalendario } =
    useActividadesCalendarioQuery({
      fechaDesde: mesDesde,
      fechaHasta: mesHasta,
      search: buscar || undefined,
      estados: estadosQuery,
      instrumento,
      gradoAsignaturaPares: tabActiva?.pares,
    })
  // Género vía `articuloDefinido`: un rótulo futuro puede ser masculino ("Proyecto").
  const nuevoRotuloLabel = tabActiva?.rotulo ?? ROTULO_ACTIVIDAD_FALLBACK
  const nuevoGenero = concordanciaRotulo(nuevoRotuloLabel)

  // `search`/`estados`/`instrumento` se filtran en el servidor.
  const {
    data: miasResult,
    isPending,
    isError,
    error,
    refetch,
    isPlaceholderData,
    dataUpdatedAt: miasUpdatedAt,
  } = useActividadesMiasQuery({
    search: buscar || undefined,
    estados: estadosQuery,
    instrumento,
    size: 50,
    offset: 0,
    dia,
    gradoAsignaturaPares: tabActiva?.pares,
  })
  const filtered = miasResult?.rows ?? []
  // Pestañas, resumen y calendario no pintan su error (p. ej. 42501): va al aviso de la página.
  useNotificarErrores([errorTabs, errorStats, errorCalendario])
  // El detalle no trae el dueño: se busca en lo ya cargado (rail y calendario).
  const actividadAbiertaAjena = actividadId
    ? esAjena(
        filtered.find((a) => String(a.id) === actividadId) ??
          calendarioActividades.find((a) => String(a.id) === actividadId),
      )
    : false
  const diaAnterior = miasResult?.diaAnterior ?? null
  const diaSiguiente = miasResult?.diaSiguiente ?? null

  // Si tras cambiar filtros el día activo llega vacío, salta una vez al día ocupado más cercano que informa la respuesta.
  const firmaFiltros = JSON.stringify([
    buscar,
    estadosQuery,
    instrumento,
    tabActiva?.rotulo,
    search.sede,
    search.ano,
    search.jornada,
    search.docente,
  ])
  const [firmaResuelta, setFirmaResuelta] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!miasResult || isPlaceholderData || firmaResuelta === firmaFiltros) return
    setFirmaResuelta(firmaFiltros)
    const destino = miasResult.rows.length === 0 ? (diaSiguiente ?? diaAnterior) : null
    if (destino && destino !== dia) setDia(destino)
  })

  // Filtros del reporte `planeador-actividades` sin `dia`, con alcance e instrumento (sin ellos traía actividades no visibles).
  const exportFilters = {
      SEARCH: buscar || undefined,
      ESTADOS: estado ? [statusToEstadoDerivado(estado as ActividadStatus)] : undefined,
      GRADO_ASIGNATURA_PARES: tabActiva?.pares.length ? tabActiva.pares.map(parToString) : undefined,
      FUNCIONARIO: scope.funcionario,
      SEDE: scope.sedeId,
      PERIODO: scope.periodoId,
      INSTRUMENTO: instrumento,
    }
  // Encabezados reales de la pestaña: el reporte trae fijos "Actividad"/"Unidad tematica".
  const { data: unidadTabs } = useUnidadesTabsQuery()
  const rotulosExport = tabActiva
    ? {
        actividad: tabActiva.rotulo,
        unidad: resolverRotuloUnidad(tabActiva.referenteId, tabActiva.gradoIds[0], unidadTabs),
      }
    : undefined

  // "Exportar todo" (JSON): TODAS las actividades del docente, no `filtered` (acotado por día/búsqueda/estado y paginado).
  // El endpoint exige filtro: se mandan `IDS` de una consulta aparte sin filtros.
  const [importarOpen, setImportarOpen] = React.useState(false)
  const [exportandoTodo, setExportandoTodo] = React.useState(false)
  const exportarJson = useExportarActividadesJson({
    mutationConfig: {
      onSuccess: (actividadesExportadas) => {
        downloadJson(`actividades-planeador-${toDateOnly(new Date())}.json`, actividadesExportadas)
        notify(`${actividadesExportadas.length} actividad(es) exportada(s).`)
      },
      onError: () => notify("No se pudo exportar el JSON de actividades.", { variant: "error" }),
    },
  })

  async function handleExportarJson() {
    setExportandoTodo(true)
    try {
      const todas = await fetchTodasLasActividadesMias({
        funcionario: scope.funcionario,
        sede: scope.sedeId,
        periodo: scope.periodoId,
      })
      if (todas.length === 0) {
        notify(
          viendoOtroDocente
            ? "El docente no tiene actividades para exportar."
            : "No tienes actividades para exportar.",
          { variant: "error" },
        )
        return
      }
      exportarJson.mutate({ ids: todas.map((actividad) => actividad.id) })
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setExportandoTodo(false)
    }
  }

  // Cada actividad va en su celda de inicio y de cierre, validadas por separado contra el mes visible:
  // el endpoint devuelve por solapamiento y anclar por `fecha` la duplicaba en dos meses.
  const events = (() => {
    const map = new Map<number, DayEvent[]>()
    function plantar(day: number, a: (typeof calendarioActividades)[number]) {
      const list = map.get(day) ?? []
      // `gradoGrupo` ("601"); se cae al id solo si el backend aún no manda `grado_grupo`.
      list.push({
        id: a.id,
        code: a.gradoGrupo ?? String(a.id).slice(-3),
        label: mostrarDocente && a.docenteNombre ? `${a.titulo} · ${a.docenteNombre}` : a.titulo,
        status: a.status,
      })
      map.set(day, list)
    }
    for (const a of calendarioActividades) {
      if (a.fechaInicio >= mesDesde && a.fechaInicio <= mesHasta) {
        const inicio = parseLocalDate(a.fechaInicio)
        if (inicio) plantar(inicio.getDate(), a)
      }
      // Un solo día: no se duplica en la misma celda.
      if (
        a.fechaCierre !== a.fechaInicio &&
        a.fechaCierre >= mesDesde &&
        a.fechaCierre <= mesHasta
      ) {
        const cierre = parseLocalDate(a.fechaCierre)
        if (cierre) plantar(cierre.getDate(), a)
      }
    }
    return map
  })()

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle action={<PrepareOfflineButton />}>Planeador</TableScreenTitle>
        <DatosDelBadge updatedAt={miasUpdatedAt} ttl={TTL_OFFLINE.grupo} className="mx-(--screen-spacing) mt-2" />
        <PlaneadorTabs />

        <TableScreenToolbar>
          {/* Fila propia (`w-full`) arriba del buscador; no se renderiza para un docente. */}

          <SearchPlaneador
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            instrumentoOptions={instrumentoOptions}
          />

          {/* Acciones junto al buscador; "Nueva" y "…" forman un control partido (`gap-0` anula el gap de `TableScreenActions`). */}
            <TableScreenActions>
              <div className="flex gap-0">
                {puedeCrear && (
                  <Button
                    color="primary"
                    size="sm"
                    variant="fill"
                    aria-label={`Nuev${nuevoGenero} ${rotuloEnFrase(nuevoRotuloLabel)}`}
                    className="rounded-r-none border-r-0"
                    nativeButton={false}
                    render={
                      <Link
                        to={paths.app.planeadorActividadCrear.getHref()}
                        search={tabActiva ? { rotulo: tabActiva.rotulo } : undefined}
                      />
                    }
                  >
                    <PlusCircleIcon data-icon="inline-start" />
                    Nuev{nuevoGenero} {rotuloEnFrase(nuevoRotuloLabel)}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        color="primary"
                        size="sm"
                        variant="fill"
                        aria-label="Más opciones"
                        className={puedeCrear ? "rounded-l-none" : undefined}
                      />
                    }
                  >
                    <DotsThreeIcon />
                  </DropdownMenuTrigger>
                  {/* "Exportar todo"/"Importar" son el intercambio JSON (ver `exportarJson`), no el PDF/Excel. */}
                  <DropdownMenuContent align="end">
                    {/* La planilla no acepta `?docente=`: mostraría la del usuario. */}
                    {!viendoOtroDocente && (
                      <DropdownMenuItem
                        render={<Link to={paths.app.planeadorPlanilla.getHref()} />}
                      >
                        Planilla de calificación
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => refetch()}>Recargar</DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={exportandoTodo || exportarJson.isPending || soloEnLinea.disabled}
                      onClick={handleExportarJson}
                    >
                      Exportar todo
                    </DropdownMenuItem>
                    {puedeCrear && (
                      <DropdownMenuItem disabled={soloEnLinea.disabled} onClick={() => setImportarOpen(true)}>
                        Importar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Mismo diálogo que Cobertura: los filtros del rail viajan al reporte real. */}
              {/* El reporte filtra por el usuario del token y aún no recibe el docente: se oculta al ver a otro. */}
              {scope.funcionario == null && (
                <DialogExportActividades
                  rows={filtered}
                  filters={exportFilters}
                  rotulos={rotulosExport}
                />
              )}
              {/* Controlado acá: un diálogo anidado en el menú se desmonta al cerrarse el menú. */}
              <DialogImportarActividadesJson open={importarOpen} onOpenChange={setImportarOpen} />
            </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <PendingCreations tipo="actividad" />
      <TableScreenBody>
          <>
            <PlaneadorLecturaBanner className="mb-4" />
            {/* Resumen de `/actividades/stats` con los filtros del buscador (ver `conteosVisibles`). */}
            <div className="mb-6">
              <PlaneadorSummaryCards
                counts={conteosVisibles}
              />
            </div>

            {/* `minmax(0,1fr)` y no `1fr`: `1fr` no baja del mínimo del contenido y una tabla ancha desborda. */}
            <div className="grid gap-6 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,210px)_minmax(0,1fr)]">
              {/* Rail: desde `md` sale del flujo (`absolute inset-0`) para que el calendario fije el alto de la fila
                y la lista mida contra él; bajo `md` vuelve al flujo. */}
              <section aria-label="Listado de actividades" className="relative min-h-0">
                <div className="flex flex-col gap-3 md:absolute md:inset-0">
                  {/* El rail mide 180/210 px: los botones se achican por className (h-6/size-6) bajo el xs del DS. */}
                  <div className="flex items-center justify-between gap-0.5">
                    <Button
                      variant="soft"
                      color="muted"
                      size="xs"
                      disabled={dia === todayDateOnly()}
                      className="h-6 rounded-none px-2 text-[11px] tracking-wide uppercase"
                      onClick={() => setDia(todayDateOnly())}
                    >
                      Hoy
                    </Button>
                    <span className="text-muted-foreground text-[11px] font-medium tracking-wide whitespace-nowrap uppercase">
                      {(parseLocalDate(dia) ?? new Date()).toLocaleDateString("es-CO", {
                        weekday: "long",
                        day: "2-digit",
                      })}
                    </span>
                    <div className="flex gap-0">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="outline"
                              color="neutral"
                              size="icon-xs"
                              aria-label="Día anterior"
                              className="size-6 rounded-none border-r-0"
                              disabled={!diaAnterior}
                              onClick={() => diaAnterior && setDia(diaAnterior)}
                            />
                          }
                        >
                          <CaretLeftIcon />
                        </TooltipTrigger>
                        <TooltipContent>Día anterior</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="outline"
                              color="neutral"
                              size="icon-xs"
                              aria-label="Día siguiente"
                              className="size-6 rounded-none"
                              disabled={!diaSiguiente}
                              onClick={() => diaSiguiente && setDia(diaSiguiente)}
                            />
                          }
                        >
                          <CaretRightIcon />
                        </TooltipTrigger>
                        <TooltipContent>Día siguiente</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                    {isPending && (
                      <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-8 text-sm">
                        <LoadingLabel>Cargando…</LoadingLabel>
                      </div>
                    )}

                    {isError && (
                      <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                        <p className="text-red text-sm">{getErrorMessage(error)}</p>
                        <Button
                          variant="outline"
                          color="neutral"
                          size="sm"
                          onClick={() => refetch()}
                        >
                          Reintentar
                        </Button>
                      </div>
                    )}

                    {!isPending && !isError && filtered.length === 0 && (
                      <div className="text-muted-foreground px-6 py-8 text-center text-sm">
                        {buscar
                          ? `Sin registros que coincidan con "${buscar}".`
                          : `Sin registros vigentes el ${formatDate(dia)}.`}
                      </div>
                    )}

                    {!isPending && !isError && filtered.length > 0 && (
                      <ul className="flex flex-col gap-2">
                        {filtered.map((actividad) => (
                          // Precarga el detalle al apuntar/enfocar la card.
                          <li
                            key={actividad.id}
                            onPointerEnter={() => prefetchActividadDetalle(queryClient, actividad.id)}
                            onFocus={() => prefetchActividadDetalle(queryClient, actividad.id)}
                          >
                            {/* Actividad de otro docente (Coordinador): solo lectura. */}
                            <PlaneadorSoloLecturaScope activo={esAjena(actividad)}>
                              <ActividadCard
                                actividad={actividad}
                                mostrarDocente={mostrarDocente}
                                selected={String(actividad.id) === actividadId}
                                onSelect={() => setActividadId(String(actividad.id))}
                                onShowGrades={() => setMode(String(actividad.id), "grades")}
                                onShowApproval={() => setMode(String(actividad.id), "approval")}
                                onEdit={() =>
                                  navigate({
                                    to: paths.app.planeadorActividadEditar.getHref(
                                      String(actividad.id),
                                    ),
                                  })
                                }
                                // Si se borró la abierta, se cierra el panel (mismo path que `onClose`).
                                onDeleted={() => {
                                  if (actividadId === String(actividad.id)) {
                                    setActividadId(undefined)
                                  }
                                }}
                              />
                            </PlaneadorSoloLecturaScope>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

              {/* Acotada a la ventana: un mes largo scrollea por dentro sin arrastrar el header del rail. `max-h` (no `h`)
                evita el hueco en blanco; por eso el hijo usa `flex-1 min-h-0` y no `h-full`. */}
              <section
                aria-label={actividadId ? "Detalle de la actividad" : "Calendario del planeador"}
                className="md:flex md:max-h-[calc(100dvh-16rem)] md:min-h-0 md:flex-col"
              >
                {actividadId ? (
                  <PlaneadorSoloLecturaScope activo={actividadAbiertaAjena}>
                    <ActividadDetallePanel
                      actividadId={Number(actividadId)}
                      mode={panelMode}
                      onClose={() => setActividadId(undefined)}
                      onShowGrades={() => setMode(actividadId, "grades")}
                      onShowApproval={() => setMode(actividadId, "approval")}
                    />
                  </PlaneadorSoloLecturaScope>
                ) : (
                  <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                    <PlaneadorMonthGrid
                      month={displayMonth}
                      events={events}
                      onMonthChange={(next) =>
                        setDisplayMonth(new Date(next.getFullYear(), next.getMonth(), 1))
                      }
                      // Día clickeado = inicio y cierre de la nueva actividad; sin permiso de crear no es clickeable.
                      onDayClick={
                        puedeCrear
                          ? (date) => {
                              const fecha = toDateOnly(date)
                              navigate({
                                to: paths.app.planeadorActividadCrear.getHref(),
                                search: {
                                  fechaInicio: fecha,
                                  fechaCierre: fecha,
                                  rotulo: tabActiva?.rotulo,
                                },
                              })
                            }
                          : undefined
                      }
                      // Abre la actividad de la celda en vez de crear una nueva.
                      onEventClick={(id) => setActividadId(String(id))}
                      onEventHover={(id) => prefetchActividadDetalle(queryClient, id)}
                    />
                  </div>
                )}
              </section>
            </div>
          </>
      </TableScreenBody>
    </TableScreen>
  )
}
