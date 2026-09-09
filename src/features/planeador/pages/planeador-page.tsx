import * as React from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import {
  PlusCircleIcon,
  DotsThreeIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"

import { useActividadesStatsQuery } from "@/features/planeador/api/query/use-actividades-stats-query"
import { useActividadesCalendarioQuery } from "@/features/planeador/api/query/use-actividades-calendario-query"
import { useActividadesMiasQuery } from "@/features/planeador/api/query/use-actividades-mias-query"
import { useInstrumentoEvaluacionCatalogQuery } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import { useExportarActividadesJson } from "@/features/planeador/api/mutations/exportar-actividades-json"
import { ActividadCard } from "@/features/planeador/components/actividad-card"
import { ActividadDetallePanel } from "@/features/planeador/components/actividad-detalle-panel"
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
import { VIEW_OPTIONS } from "@/features/planeador/components/view-options"
import { statusToEstadoDerivado } from "@/features/planeador/lib/estado-derivado"
import type { ActividadStatus } from "@/features/planeador/api/types/actividad"

import { planeadorRoute } from "@/router"
import { paths } from "@/config/paths"
import { formatDate, parseLocalDate, toDateOnly, todayDateOnly } from "@/features/planeador/lib/format-date"

/**
 * Página principal del Planeador. Layout 2-columnas:
 *   izquierda  → strip "Hoy" + lista vertical de cards (filtradas por URL).
 *   derecha    → grilla mensual con badges por día.
 *
 * El estado de la página vive en la URL (`?buscar=…&filtro=…`) salvo
 * `displayMonth` (mes que se está viendo en el calendario), que es local
 * porque no aporta nada persistirlo entre sesiones.
 */
export function PlaneadorPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: planeadorRoute.id })

  // Búsqueda y filtros avanzados, todos en la URL. Ver
  // `use-planeador-filters`.
  const { filters, applyFilters, clearAllFilters, activeFilterCount } =
    usePlaneadorFilters()
  const buscar = filters.buscar
  const estado = filters.estado
  const view = filters.vista || "actividad"
  // Actividad abierta en el panel derecho. `undefined` => se muestra el
  // calendario.
  const actividadId = search.actividad ?? undefined
  const setActividadId = (next: string | undefined) =>
    navigate({
      to: planeadorRoute.id,
      search: (prev) => ({ ...prev, actividad: next }),
      replace: true,
    })

  // Día activo de la barra "Hoy | MARTES 16 | < >" del rail (`?dia=`,
  // paginado por día activo de `GET /actividades/mias` — colección Postman
  // `planeador-guia-completa`, 4.1/8.3). Vive en la URL, no en estado local,
  // por el mismo motivo que `actividadId`. Ausente en la URL == hoy.
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

  // Modo del panel de detalle por actividad. Map `id → modo` en vez de dos
  // flags sueltos: la última acción del usuario gana (Marcar después de
  // Aprobar cambia a grades, no se queda en approval por orden de check).
  // Si la entrada no existe para la actividad activa, cae a "info".
  // Los handlers también setean `actividadId` — sin ese paso, clickear el
  // chulito estando en el calendario no abría el panel.
  const [panelModeByActividad, setPanelModeByActividad] = React.useState<
    Record<string, "info" | "grades" | "approval">
  >({})

  const panelMode: "info" | "grades" | "approval" =
    actividadId !== undefined
      ? panelModeByActividad[actividadId] ?? "info"
      : "info"

  // Abre el panel en una actividad y le setea el modo pedido. Se usa tanto
  // desde la card (Marcar / Aprobar) como desde los mismos botones del
  // header del panel — así el comportamiento es idéntico sin importar
  // desde dónde se disparen.
  function setMode(actividadId: string, mode: "grades" | "approval") {
    setActividadId(actividadId)
    setPanelModeByActividad((prev) => ({ ...prev, [actividadId]: mode }))
  }

  // 3 endpoints reales en vez del hack de traer TODO con `size=500` y
  // derivar stats/calendario/listado en el cliente (`use-actividades-query`,
  // ya no se usa acá — ver colección Postman `planeador-pantalla-principal`).
  const { data: statsCounts } = useActividadesStatsQuery()

  // Catálogo `INSTRUMENTO_EVALUACION` (`TLISTA_VALOR`) para el filtro
  // "Instrumento" del buscador — reemplaza la lista fija que traía antes.
  const { data: instrumentoOptions = [] } = useInstrumentoEvaluacionCatalogQuery()

  const mesDesde = React.useMemo(
    () => toDateOnly(new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1)),
    [displayMonth],
  )
  const mesHasta = React.useMemo(
    () => toDateOnly(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0)),
    [displayMonth],
  )
  const { data: calendarioActividades = [] } = useActividadesCalendarioQuery({
    fechaDesde: mesDesde,
    fechaHasta: mesHasta,
  })

  // `search`/`estados` ya filtran del lado del servidor — `filtro`
  // (instrumento) queda armado para la próxima iteración, cuando llegue su
  // catálogo.
  const {
    data: miasResult,
    isPending,
    isError,
    refetch,
  } = useActividadesMiasQuery({
    search: buscar || undefined,
    estados: estado ? statusToEstadoDerivado(estado as ActividadStatus) : undefined,
    size: 50,
    offset: 0,
    dia,
  })
  const filtered = miasResult?.rows ?? []
  const diaAnterior = miasResult?.diaAnterior ?? null
  const diaSiguiente = miasResult?.diaSiguiente ?? null

  // "Exportar todo"/"Importar" del menú "…": intercambio JSON de
  // actividades (colección Postman
  // `planeador-actividades-exportar-importar`), aparte del export PDF/Excel
  // que ya cubre `DialogExportActividades`. El exportar reusa las mismas
  // actividades ya filtradas/visibles en el rail — mismo criterio que ese
  // otro diálogo — porque el endpoint real exige al menos un filtro (`IDS`,
  // acá) y no admite "exportar todo" sin acotar.
  const [importarOpen, setImportarOpen] = React.useState(false)
  const exportarJson = useExportarActividadesJson({
    mutationConfig: {
      onSuccess: (actividadesExportadas) => {
        downloadJson(
          `actividades-planeador-${toDateOnly(new Date())}.json`,
          actividadesExportadas,
        )
        toast.success(`${actividadesExportadas.length} actividad(es) exportada(s).`)
      },
      onError: () => toast.error("No se pudo exportar el JSON de actividades."),
    },
  })

  function handleExportarJson() {
    if (filtered.length === 0) {
      toast.error("No hay actividades para exportar con los filtros actuales.")
      return
    }
    exportarJson.mutate({ ids: filtered.map((actividad) => actividad.id) })
  }

  // Map day-of-month → actividades, para las filas de la grilla. El
  // endpoint devuelve por SOLAPAMIENTO (una actividad que sigue abierta
  // aparece también en el mes donde arrancó), y ancla `fecha` al inicio (o
  // a `fecha_desde` si el inicio cae afuera). Eso hacía que la MISMA
  // actividad se plotara en dos meses distintos —una vez por su inicio,
  // otra por el "sigue abierta" del mes siguiente— y se contara doble al
  // mirar los dos meses. Acá se ancla SOLO por `fechaCierre` (cuándo
  // vence) y se descarta lo que no cierre dentro del mes visible, así cada
  // actividad aparece en un único mes: el de su cierre.
  const events = React.useMemo(() => {
    const map = new Map<number, DayEvent[]>()
    for (const a of calendarioActividades) {
      if (a.fechaCierre < mesDesde || a.fechaCierre > mesHasta) continue
      const anchor = parseLocalDate(a.fechaCierre)
      if (!anchor) continue
      const day = anchor.getDate()
      const list = map.get(day) ?? []
      list.push({ id: a.id, code: String(a.id).slice(-3), label: a.label, status: a.status })
      map.set(day, list)
    }
    return map
  }, [calendarioActividades, mesDesde, mesHasta])

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Planeador</TableScreenTitle>
        <PlaneadorTabs />

        <TableScreenToolbar>
          <SearchPlaneador
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            instrumentoOptions={instrumentoOptions}
          />

          {/* Las acciones de la pantalla van junto al buscador, no en el
              título: es donde las tiene el resto de los listados.

              "Nueva actividad" y su "…" van pegados como un solo control
              partido —el primero se redondea a la izquierda, el segundo a la
              derecha, y se les quita el borde donde se tocan—; el `div` con
              `gap-0` neutraliza el espacio que `<TableScreenActions>` agrega
              entre hijos. */}
          <TableScreenActions>
            <div className="flex gap-0">
              <Button
                color="primary"
                size="sm"
                variant="fill"
                aria-label="Nueva actividad"
                className="rounded-r-none border-r-0"
                render={<Link to={paths.app.planeadorActividadCrear.getHref()} />}
              >
                <PlusCircleIcon data-icon="inline-start" />
                Nueva actividad
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      color="primary"
                      size="sm"
                      variant="fill"
                      aria-label="Más opciones"
                      className="rounded-l-none"
                    />
                  }
                >
                  <DotsThreeIcon />
                </DropdownMenuTrigger>
                {/* "Recargar" apunta a `refetch` del query. "Exportar todo"
                    e "Importar" son el intercambio JSON de actividades —
                    ver el comentario junto a `exportarJson` más arriba—,
                    no el export PDF/Excel del botón de al lado. */}
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link to={paths.app.planeadorPlanilla.getHref()} />}>
                    Planilla de calificación
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => refetch()}>
                    Recargar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={exportarJson.isPending}
                    onClick={handleExportarJson}
                  >
                    Exportar todo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setImportarOpen(true)}>
                    Importar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* El export general reusa el mismo diálogo que el listado de
                Cobertura (`DialogExportActividades`): las filas ya filtradas
                viajan como `filters` y el backend reporta cuántas se
                exportaron. El trigger que el diálogo trae adentro reemplaza
                al `<Button>` de export que estaba disabled. */}
            <DialogExportActividades
              rows={filtered}
            />
            {/* Controlado desde acá y no con su propio `DialogTrigger`: el
                que lo abre es un `DropdownMenuItem`, y un diálogo anidado
                dentro del menú se desmonta apenas el menú cierra. */}
            <DialogImportarActividadesJson
              open={importarOpen}
              onOpenChange={setImportarOpen}
            />
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {/* Cards de resumen por estado. Salen de `/actividades/stats`, no de
            contar el listado de abajo — así el conteo no cambia al filtrar
            ese listado (si contara sobre `filtered`, "Pendientes: 3" caería
            a "Pendientes: 1" apenas el usuario tipea en el buscador y
            perdería el sentido de "cuántas tengo en total"). El link de
            cada card setea `?estado=…` en la URL para que el filter bar
            del listado muestre ese estado por defecto. */}
        <div className="mb-6">
          <PlaneadorSummaryCards
            counts={
              statsCounts ?? { pending: 0, "in-progress": 0, completed: 0, cancelled: 0 }
            }
          />
        </div>

        {/* La segunda pista va `minmax(0,1fr)` y no `1fr`: `1fr` equivale a
            `minmax(auto,1fr)`, que no baja del ancho mínimo del contenido, así
            que una tabla ancha empuja la columna en vez de scrollear dentro de
            su propio contenedor y desborda la pantalla. */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,210px)_minmax(0,1fr)]">
          {/* Rail izquierda. La lista crece con la cantidad de actividades y hacía scrollear
              la página entera, dejando al calendario —mucho más corto— con un
              vacío enorme al lado. Un `flex-1` no alcanza para acotarla: el
              `<main>` del layout crece con el documento, así que ningún
              ancestro define una altura contra la cual medir.

              La referencia real es el calendario, que es quien fija el alto de
              la fila de la grilla. Desde `md` el contenido del rail se saca
              del flujo (`absolute inset-0`): así deja de aportar altura
              intrínseca —la fila la decide el calendario solo— y a la vez
              queda estirado a esa altura, que es contra lo que el `flex-1` de
              la lista puede medir. Bajo `md` (una sola columna) vuelve al
              flujo normal y la lista se muestra completa. */}
          <section
            aria-label="Listado de actividades"
            className="relative min-h-0"
          >
            <div className="flex flex-col gap-3 md:absolute md:inset-0">
              {/* Header del rail: chip "Hoy" a la izquierda, el día al centro y
                las dos flechas a la derecha. El `Button` del DS ya trae el
                tamaño más chico en h-7/size-7 (xs/icon-xs); acá no encaja —el
                rail mide 180/210 px de ancho y cada px cuenta—, así que sólo
                se achica con className (h-6/size-6) en vez de reconstruir el
                estilo a mano. */}
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
                  <Button
                    variant="outline"
                    color="neutral"
                    size="icon-xs"
                    aria-label="Día anterior"
                    className="size-6 rounded-none border-r-0"
                    disabled={!diaAnterior}
                    onClick={() => diaAnterior && setDia(diaAnterior)}
                  >
                    <CaretLeftIcon />
                  </Button>
                  <Button
                    variant="outline"
                    color="neutral"
                    size="icon-xs"
                    aria-label="Día siguiente"
                    className="size-6 rounded-none"
                    disabled={!diaSiguiente}
                    onClick={() => diaSiguiente && setDia(diaSiguiente)}
                  >
                    <CaretRightIcon />
                  </Button>
                </div>
              </div>

              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {isPending && (
                  <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-8 text-sm">
                    <Spinner /> Cargando actividades…
                  </div>
                )}

                {isError && (
                  <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                    <p className="text-red text-sm">
                      Ocurrió un error al cargar las actividades.
                    </p>
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
                      ? `Sin actividades que coincidan con "${buscar}".`
                      : `Sin actividades vigentes el ${formatDate(dia)}.`}
                  </div>
                )}

                {!isPending && !isError && filtered.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {filtered.map((actividad) => (
                      <li key={actividad.id}>
                        <ActividadCard
                          actividad={actividad}
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
                          // Si la actividad que se borró era la abierta en
                          // el panel, cerramos el panel: sin actividadId
                          // la página vuelve a mostrar el calendario en la
                          // columna derecha (mismo path que `onClose`).
                          onDeleted={() => {
                            if (actividadId === String(actividad.id)) {
                              setActividadId(undefined)
                            }
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Columna derecha: calendario por defecto, detalle de la actividad
              cuando hay una seleccionada. Siempre acotada a la ventana (antes
              solo pasaba con el detalle abierto): un mes de 6 semanas puede
              ser más alto que el viewport, y sin este tope la página entera
              terminaba scrolleando para mostrarlo completo —eso arrastraba
              el header "Hoy" del rail (que no tiene su propio scroll, solo
              la lista de abajo lo tiene) hasta quedar semi-tapado por el
              `TableScreenHeader` sticky a mitad de scroll. Con el tope, si el
              mes no entra, scrollea POR DENTRO de esta columna en vez de
              arrastrar toda la página.

              `max-h` + `flex flex-col`, no `h` a secas: un `height` fijo
              obliga a la columna a medir SIEMPRE ese alto, aunque el
              calendario (que tiene un contenido casi constante, ~6 semanas)
              o el panel de detalle midan MENOS —eso dejaba un hueco en
              blanco debajo del contenido real y, encima, empujaba la PÁGINA
              entera más alta que el viewport (scroll de la página con un
              tramo en blanco al fondo, en vez de contenerse). Con `max-h`,
              la columna solo crece hasta el tope cuando el contenido de
              verdad lo necesita; si es más corto, se achica con él. El hijo
              que antes usaba `h-full` para heredar ese alto fijo ahora usa
              `flex-1 min-h-0` (ver `ActividadDetallePanel` y el `div` de
              abajo): con `max-h` en el padre, un `height: 100%` no siempre
              resuelve (necesita un alto DEFINIDO, no una cota), `flex-1` sí
              funciona igual de bien contra un contenedor acotado por
              `max-height`. */}
          <section
            aria-label={
              actividadId
                ? "Detalle de la actividad"
                : "Calendario del planeador"
            }
            className="md:flex md:max-h-[calc(100dvh-16rem)] md:min-h-0 md:flex-col"
          >
            {actividadId ? (
              <ActividadDetallePanel
                actividadId={Number(actividadId)}
                mode={panelMode}
                onClose={() => setActividadId(undefined)}
                onShowGrades={() => setMode(actividadId, "grades")}
                onShowApproval={() => setMode(actividadId, "approval")}
              />
            ) : (
              <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                <PlaneadorMonthGrid
                  month={displayMonth}
                  events={events}
                  onMonthChange={(next) =>
                    setDisplayMonth(
                      new Date(next.getFullYear(), next.getMonth(), 1),
                    )
                  }
                />
                {/* viewOption no se usa en la UI todavía; se deja armado para
                    cuando llegue la implementación de "Ver por Unidad" / etc. */}
                <p className="text-muted-foreground sr-only">
                  Vista actual:{" "}
                  {VIEW_OPTIONS.find((o) => o.value === view)?.label}
                </p>
              </div>
            )}
          </section>
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
