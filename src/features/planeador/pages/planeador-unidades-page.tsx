import * as React from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"

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
  CaretLeftIcon,
  CaretRightIcon,
  FileDownloadOutlinedIcon,
} from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"

import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { SearchPlaneador } from "@/features/planeador/components/search/search-planeador"
import { PlaneadorTabs } from "@/features/planeador/components/planeador-tabs"
import { UnidadCard } from "@/features/planeador/components/unidad-card"
import { UnidadDetallePanel } from "@/features/planeador/components/unidad-detalle-panel"
import { useUnidadesFilters } from "@/features/planeador/hooks/use-planeador-filters"
import { formatDate, parseLocalDate, todayDateOnly } from "@/features/planeador/lib/format-date"

import { planeadorUnidadesRoute } from "@/router"

/**
 * Pestaña "Unidad temática" del Planeador. Mismo esqueleto que la de
 * Actividades —rail de cards a la izquierda, detalle a la derecha— pero sobre
 * el modelo de unidades y sin calendario: la unidad no es un evento de un día,
 * así que la columna derecha muestra siempre el detalle.
 */
export function PlaneadorUnidadesPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: planeadorUnidadesRoute.id })

  const buscar = search.buscar ?? ""
  const { filters, applyFilters, clearAllFilters, activeFilterCount } =
    useUnidadesFilters()

  // Día activo de la barra "Hoy | MARTES 16 | < >" (`?dia=`, paginado por
  // día activo de `GET /unidades` — colección Postman `planeador-guia-
  // completa`, 2.1). Mismo criterio que `planeador-page.tsx`.
  const dia = search.dia ?? todayDateOnly()
  const setDia = (next: string) =>
    navigate({
      to: planeadorUnidadesRoute.id,
      search: (prev) => ({ ...prev, dia: next }),
      replace: true,
    })

  const {
    data: unidadesResult,
    isPending,
    isError,
    refetch,
  } = useUnidadesQuery({ dia })
  const unidades = unidadesResult?.rows ?? []
  const diaAnterior = unidadesResult?.diaAnterior ?? null
  const diaSiguiente = unidadesResult?.diaSiguiente ?? null

  const filtered = React.useMemo(() => {
    const term = buscar.trim().toLowerCase()
    if (!term) return unidades
    return unidades.filter((u) =>
      [u.nombre, u.area, u.asignatura, u.grado].join(" ").toLowerCase().includes(term),
    )
  }, [unidades, buscar])

  // Unidad abierta en el panel. Si la URL no trae ninguna —o trae una que ya
  // no está en la lista filtrada— se cae a la primera, para que la columna
  // derecha nunca quede vacía.
  const unidadIdNum = filtered.find((u) => String(u.id) === search.unidad)?.id ?? filtered[0]?.id
  const unidadId = unidadIdNum !== undefined ? String(unidadIdNum) : undefined

  const setUnidadId = (next: string) =>
    navigate({
      to: planeadorUnidadesRoute.id,
      search: (prev) => ({ ...prev, unidad: next }),
      replace: true,
    })

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
          {/* Misma distribución que en la pestaña "Actividades": el "Agregar…"
              con su "…" van pegados como un control partido y el exportar va
              al lado, así todas las acciones del listado quedan juntas. */}
          <TableScreenActions>
            <Button
              color="primary"
              size="sm"
              variant="fill"
              aria-label="Agregar unidad"
              render={<Link to={paths.app.planeadorUnidadCrear.getHref()} />}
            >
              <PlusCircleIcon data-icon="inline-start" />
              Agregar unidad
            </Button>
            <Button
              variant="outline"
              color="muted"
              size="icon-sm"
              disabled
              aria-label="Exportar unidades filtradas"
            >
              <FileDownloadOutlinedIcon />
            </Button>
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {/* La segunda pista va `minmax(0,1fr)` y no `1fr`: `1fr` equivale a
            `minmax(auto,1fr)`, que no baja del ancho mínimo del contenido, así
            que una tabla ancha empuja la columna en vez de scrollear dentro de
            su propio contenedor y desborda la pantalla. */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,210px)_minmax(0,1fr)]">
          {/* Rail izquierda. Mismo mecanismo que en la pestaña de Actividades:
              el contenido se saca del flujo desde `md` para que la altura de
              la fila la fije la columna derecha y la lista scrollee por dentro
              en vez de estirar la página. */}
          <section aria-label="Listado de unidades temáticas" className="relative min-h-0">
            <div className="flex flex-col gap-3 md:absolute md:inset-0">
              <div className="flex items-center justify-between gap-1">
                <Button
                  variant="soft"
                  color="muted"
                  size="xs"
                  disabled={dia === todayDateOnly()}
                  className="rounded-none"
                  onClick={() => setDia(todayDateOnly())}
                >
                  Hoy
                </Button>
                <span className="text-muted-foreground text-xs font-medium tracking-wide whitespace-nowrap uppercase">
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
                    className="rounded-none border-r-0"
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
                    className="rounded-none"
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
                    <Spinner /> Cargando unidades…
                  </div>
                )}

                {isError && (
                  <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                    <p className="text-red text-sm">
                      Ocurrió un error al cargar las unidades.
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
                      ? `Sin unidades que coincidan con "${buscar}".`
                      : `Sin unidades con actividades vigentes el ${formatDate(dia)}.`}
                  </div>
                )}

                {!isPending && !isError && filtered.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {filtered.map((unidad) => (
                      <li key={unidad.id}>
                        <UnidadCard
                          unidad={unidad}
                          selected={String(unidad.id) === unidadId}
                          onSelect={() => setUnidadId(String(unidad.id))}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Detalle. Se acota a la ventana y scrollea por dentro: si creciera
              libre arrastraría el alto de la fila —y con él el del rail, que
              se mide contra esa misma fila. */}
          <section
            aria-label="Detalle de la unidad temática"
            className="min-w-0 md:h-[calc(100dvh-16rem)] md:min-h-0"
          >
            {unidadId ? (
              <UnidadDetallePanel
                unidadId={unidadId}
                onDeleted={() =>
                  navigate({
                    to: planeadorUnidadesRoute.id,
                    search: (prev) => ({ ...prev, unidad: undefined }),
                    replace: true,
                  })
                }
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center rounded-md border p-6 text-sm">
                Seleccioná una unidad para ver su detalle.
              </div>
            )}
          </section>
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
