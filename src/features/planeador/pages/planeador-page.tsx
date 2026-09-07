import * as React from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"

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
import { ActividadCard } from "@/features/planeador/components/actividad-card"
import { ActividadDetallePanel } from "@/features/planeador/components/actividad-detalle-panel"
import { DialogExportActividades } from "@/features/planeador/components/dialogs/dialog-export-actividades"
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
import { parseLocalDate } from "@/features/planeador/lib/format-date"

/** `yyyy-MM-dd` local — sin pasar por UTC, que corría el día en zonas
 *  horarias negativas cerca de medianoche. */
function toDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

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
  })
  const filtered = miasResult?.rows ?? []

  // Map day-of-month → actividades, para las filas de la grilla. El
  // endpoint ya resuelve un solo día de anclaje por actividad (`fecha`,
  // filtrando por solapamiento con el mes pedido) — no hace falta volver a
  // filtrar por mes visible ni plotear inicio/cierre a mano acá.
  const events = React.useMemo(() => {
    const map = new Map<number, DayEvent[]>()
    for (const a of calendarioActividades) {
      const anchor = parseLocalDate(a.fecha)
      if (!anchor) continue
      const day = anchor.getDate()
      const list = map.get(day) ?? []
      list.push({ id: a.id, code: String(a.id).slice(-3), label: a.label, status: a.status })
      map.set(day, list)
    }
    return map
  }, [calendarioActividades])

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
                {/* "Recargar" ya tiene a dónde apuntar (`refetch` del query);
                    el resto queda disabled hasta que su feature exista. */}
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link to={paths.app.planeadorPlanilla.getHref()} />}>
                    Planilla de calificación
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => refetch()}>
                    Recargar
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>Exportar todo</DropdownMenuItem>
                  <DropdownMenuItem disabled>Importar</DropdownMenuItem>
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
                  disabled
                  className="h-6 rounded-none px-2 text-[11px] tracking-wide uppercase"
                >
                  Hoy
                </Button>
                <span className="text-muted-foreground text-[11px] font-medium tracking-wide whitespace-nowrap uppercase">
                  {new Date().toLocaleDateString("es-CO", {
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
                  >
                    <CaretLeftIcon />
                  </Button>
                  <Button
                    variant="outline"
                    color="neutral"
                    size="icon-xs"
                    aria-label="Día siguiente"
                    className="size-6 rounded-none"
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
                      : "Sin actividades registradas."}
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
              arrastrar toda la página. */}
          <section
            aria-label={
              actividadId
                ? "Detalle de la actividad"
                : "Calendario del planeador"
            }
            className="md:h-[calc(100dvh-16rem)] md:min-h-0"
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
              <div className="md:h-full md:overflow-y-auto">
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
