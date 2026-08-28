import * as React from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
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

import { useActividadesQuery } from "@/features/planeador/api/query/use-actividades-query"
import { useExportActividad } from "@/features/planeador/api/mutations/export-actividad"
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

import { planeadorRoute } from "@/router"
import { paths } from "@/config/paths"
import { parseLocalDate } from "@/features/planeador/lib/format-date"

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

  // Vista activa del panel de detalle. Por defecto es la informativa (la
  // misma que muestra el click en la card). Cada modo se guarda por id
  // de actividad: "Marcar" (chulito) activa `grades`, "Aprobar"
  // (clipboard-check) activa `approval`. Al cambiar de card se vuelve
  // al modo "info" — los modos son propios de la actividad en la que
  // se pidieron.
  const [gradeViewActividadId, setGradeViewActividadId] = React.useState<
    string | null
  >(null)
  const [approvalViewActividadId, setApprovalViewActividadId] = React.useState<
    string | null
  >(null)
  const panelMode: "info" | "grades" | "approval" =
    actividadId !== undefined
      ? approvalViewActividadId === actividadId
        ? "approval"
        : gradeViewActividadId === actividadId
          ? "grades"
          : "info"
      : "info"

  // Al cambiar de actividad, se limpian ambos modos para no arrastrar
  // un "Marcar" o "Aprobar" de la actividad anterior.
  React.useEffect(() => {
    if (actividadId === undefined) {
      setGradeViewActividadId(null)
      setApprovalViewActividadId(null)
      return
    }
    if (gradeViewActividadId && gradeViewActividadId !== actividadId) {
      setGradeViewActividadId(null)
    }
    if (approvalViewActividadId && approvalViewActividadId !== actividadId) {
      setApprovalViewActividadId(null)
    }
  }, [actividadId, gradeViewActividadId, approvalViewActividadId])

  const {
    data: actividades = [],
    isPending,
    isError,
    refetch,
  } = useActividadesQuery()

  // Export individual desde la card. El toast sale del propio `onSuccess`
  // del mutation (mismo patrón que `useDeleteActividad`): la página solo
  // dispara la mutación con el formato elegido por el popover.
  // No es necesario `onError` propio: el response interceptor global ya
  // tostea los 4xx/5xx que escapen del handler mock.
  const exportActividad = useExportActividad()

  // Filtrado client-side: texto libre + estado. `filtro` (instrumento) queda
  // armado para la próxima iteración, cuando llegue su catálogo.
  const filtered = React.useMemo(() => {
    const term = buscar.trim().toLowerCase()
    return actividades.filter((a) => {
      if (estado && a.status !== estado) return false
      if (!term) return true
      return [a.nombre, a.asignatura, a.unidad.nombre, a.tipo, a.grado, a.grupo]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [actividades, buscar, estado])

  // Map day-of-month → actividades, para las filas de la grilla.
  // Sólo el día de INICIO y el día de CIERRE pintan fila (mismo criterio
  // que el mockup) — pintar todo el rango satura la celda y las filas
  // dejan de ser una pista visual. Un mismo día puede tener varias
  // actividades, incluso repitiendo código; el recorte visual lo hace la
  // grilla (muestra 3 y resume el resto), acá se arma la lista completa.
  const events = React.useMemo(() => {
    const map = new Map<number, DayEvent[]>()
    const isVisible = (d: Date) =>
      d.getFullYear() === displayMonth.getFullYear() &&
      d.getMonth() === displayMonth.getMonth()
    for (const a of filtered) {
      const start = parseLocalDate(a.fechaInicio)
      const end = parseLocalDate(a.fechaCierre)
      if (!start || !end) continue
      const code = a.id.slice(-3) // "601", "602"…
      for (const d of [start, end]) {
        if (!isVisible(d)) continue
        const day = d.getDate()
        const list = map.get(day) ?? []
        // Dedup por actividad (id), no por código: dos actividades distintas
        // pueden compartir código y ambas deben verse. Lo único que se evita
        // es repetir la misma actividad cuando inicia y cierra el mismo día.
        if (!list.some((e) => e.id === a.id)) {
          list.push({ id: a.id, code, label: a.asignatura, status: a.status })
        }
        map.set(day, list)
      }
    }
    return map
  }, [filtered, displayMonth])

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
                disabled
                aria-label="Nueva actividad"
                className="rounded-r-none border-r-0"
              >
                <PlusCircleIcon data-icon="inline-start" />
                Nueva actividad
              </Button>
              <Button
                color="primary"
                size="sm"
                variant="fill"
                disabled
                aria-label="Más opciones"
                className="rounded-l-none"
              >
                <DotsThreeIcon />
              </Button>
            </div>
            {/* El export general reusa el mismo diálogo que el listado de
                Cobertura (`DialogExportActividades`): las filas ya filtradas
                viajan como `filters` y el backend reporta cuántas se
                exportaron. El trigger que el diálogo trae adentro reemplaza
                al `<Button>` de export que estaba disabled. */}
            <DialogExportActividades
              rows={filtered.map((a) => ({ id: a.id, nombre: a.nombre }))}
            />
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {/* Cards de resumen por estado. Se computan sobre `actividades` (el
            set completo, no el filtrado), así el conteo no cambia al filtrar
            el listado de abajo — si filtrara, "Pendientes: 3" caería a
            "Pendientes: 1" apenas el usuario tipea en el buscador y
            perdería el sentido de "cuántas tengo en total". El link de
            cada card setea `?estado=…` en la URL para que el filter bar
            del listado muestre ese estado por defecto. */}
        <div className="mb-6">
          <PlaneadorSummaryCards actividades={actividades} />
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
                las dos flechas agrupadas a la derecha como un solo control
                partido (mismo patrón que el split-button del título). */}
              <div className="flex items-center justify-between gap-1">
                <Button
                  variant="soft"
                  color="muted"
                  size="xs"
                  disabled
                  className="rounded-none"
                >
                  Hoy
                </Button>
                <span className="text-muted-foreground text-xs font-medium tracking-wide whitespace-nowrap uppercase">
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
                    className="rounded-none border-r-0"
                  >
                    <CaretLeftIcon />
                  </Button>
                  <Button
                    variant="outline"
                    color="neutral"
                    size="icon-xs"
                    aria-label="Día siguiente"
                    className="rounded-none"
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
                          selected={actividad.id === actividadId}
                          onSelect={() => setActividadId(actividad.id)}
                          onEdit={() =>
                            navigate({
                              to: paths.app.planeadorActividadEditar.getHref(
                                actividad.id,
                              ),
                            })
                          }
                          onExport={(format) =>
                            exportActividad.mutate({ id: actividad.id, format })
                          }
                          // Si la actividad que se borró era la abierta en
                          // el panel, cerramos el panel: sin actividadId
                          // la página vuelve a mostrar el calendario en la
                          // columna derecha (mismo path que `onClose`).
                          onDeleted={() => {
                            if (actividadId === actividad.id) {
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
              cuando hay una seleccionada. El detalle es mucho más alto que el
              calendario, así que se acota a la ventana y scrollea por dentro
              si creciera libre arrastraría el alto de la fila —y con él el del
              rail, que se mide contra esa misma fila. */}
          <section
            aria-label={
              actividadId
                ? "Detalle de la actividad"
                : "Calendario del planeador"
            }
            className={
              actividadId ? "md:h-[calc(100dvh-16rem)] md:min-h-0" : undefined
            }
          >
            {actividadId ? (
              <ActividadDetallePanel
                actividadId={actividadId}
                mode={panelMode}
                onClose={() => setActividadId(undefined)}
                onShowGrades={() => setGradeViewActividadId(actividadId)}
                onShowApproval={() => setApprovalViewActividadId(actividadId)}
              />
            ) : (
              <>
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
              </>
            )}
          </section>
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
