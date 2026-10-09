import * as React from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NoticeProvider } from "@/components/notice/notice-context"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { PlusCircleIcon, FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"

import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { SearchPlaneador } from "@/features/planeador/components/search/search-planeador"
import { PlaneadorTabs } from "@/features/planeador/components/planeador-tabs"
import { UnidadCard } from "@/features/planeador/components/unidad-card"
import { UnidadDetallePanel } from "@/features/planeador/components/unidad-detalle-panel"
import { useUnidadesFilters } from "@/features/planeador/hooks/use-planeador-filters"
import { ROTULO_ACTIVIDAD_FALLBACK } from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { UNIDAD_TAB_FALLBACK } from "@/features/planeador/components/planeador-tabs"
import {
  articuloIndefinidoRotulo,
  deArticuloRotulo,
  pluralizarRotulo,
  terminacionRotulo,
} from "@/features/planeador/lib/rotulo-gramatica"

import { planeadorUnidadesRoute } from "@/router"
import {
  PlaneadorSoloLecturaScope,
  usePlaneadorSoloLectura,
} from "@/features/planeador/hooks/use-planeador-solo-lectura"
import { usePlaneadorDocenteScope } from "@/features/planeador/hooks/use-planeador-docente-scope"
import { useNotificarErrores } from "@/features/planeador/hooks/use-notificar-errores"
import {
  PlaneadorLecturaBanner,
  PlaneadorSeleccionVacia,
} from "@/features/planeador/components/planeador-docente-selector"
import { usePlaneadorAlcanceInicial } from "@/features/planeador/hooks/use-planeador-alcance-inicial"
import { esAjena } from "@/features/planeador/lib/docente-dueno"
import { getErrorMessage } from "@/lib/api-client"

/**
 * Pestaña "Unidad temática" del Planeador. Mismo esqueleto que la de
 * Actividades —rail de cards a la izquierda, detalle a la derecha— pero sobre
 * el modelo de unidades y sin calendario: la unidad no es un evento de un día,
 * así que la columna derecha muestra siempre el detalle.
 *
 * El `NoticeProvider` envuelve un `...Content` interno: tiene que ser
 * ANCESTRO de quien llama `useNotify` (los errores del selector de docente y
 * de las consultas van al aviso de la página).
 */
export function PlaneadorUnidadesPage() {
  return (
    <NoticeProvider>
      <PlaneadorUnidadesPageContent />
    </NoticeProvider>
  )
}

function PlaneadorUnidadesPageContent() {
  const navigate = useNavigate()
  const search = useSearch({ from: planeadorUnidadesRoute.id })
  const { puedeCrear } = usePlaneadorSoloLectura()
  // Sede/Año/Jornada/Docente del filtro avanzado, ver `planeador-page.tsx`:
  // los hooks de consulta leen el alcance de la URL.
  const scope = usePlaneadorDocenteScope()
  const mostrarDocente = scope.puedeElegirDocente && scope.funcionario == null

  const buscar = search.buscar ?? ""
  // Cambiar sede/año/jornada/docente borra la pestaña y la unidad abierta.
  const { filters, applyFilters, applyAlcance, clearAllFilters, activeFilterCount } =
    useUnidadesFilters()
  usePlaneadorAlcanceInicial(applyAlcance)

  // Sin `?dia=`: a diferencia de la pestaña "Actividades", esta lista todas
  // las unidades del docente, no solo las que tienen alguna actividad
  // vigente hoy — paginar por día activo acá ocultaba unidades enteras sin
  // ningún aviso (colección Postman `planeador-delta-cambios`, punto (g);
  // el parámetro se había copiado del listado de actividades).
  const { data: unidadesResult, isPending, isError, error, refetch } = useUnidadesQuery()
  const unidades = unidadesResult?.rows ?? []

  // La pestaña "Unidad temática" puede ser varias (una por referente
  // curricular/nivel educativo, `GET /planeador/unidades/tabs` — ver
  // `planeador-tabs.tsx`): con más de una, el listado se acota a los
  // grados de la pestaña activa (`?instrumento=`). Con una sola (el caso
  // más común, un docente de un solo nivel) no hay nada que acotar.
  const { data: unidadTabs = [], error: errorTabs } = useUnidadesTabsQuery()
  // El rail pinta su propio error; las pestañas no (p. ej. 42501 por un
  // docente fuera del alcance), así que van al aviso de la página.
  useNotificarErrores([errorTabs])
  const tabActiva =
    unidadTabs.length > 1
      ? (unidadTabs.find((t) => t.instrumento === search.instrumento) ?? unidadTabs[0])
      : undefined

  // "Agregar unidad" no sirve para todos los docentes: el rótulo de esta
  // pestaña varía por referente curricular (`instrumento` — "Unidad
  // temática" en Primaria, "Proyecto pedagógico" en Preescolar, ver
  // `planeador-tabs.tsx`), así que el botón usa el mismo nombre que la
  // pestaña activa en vez de "unidad" fijo.
  //
  // `rotuloUnidad` conserva la mayúscula original (cards, panel y buscador
  // lo reciben así); `tabLabel` es la versión en minúscula para embeberla a
  // mitad de frase.
  const rotuloUnidad = tabActiva?.instrumento ?? unidadTabs[0]?.instrumento ?? UNIDAD_TAB_FALLBACK
  const tabLabel = rotuloUnidad.toLowerCase()
  const tabLabelPlural = pluralizarRotulo(tabLabel)
  const exportarLabel = `Exportar ${tabLabelPlural} filtrad${terminacionRotulo(rotuloUnidad)}s`
  // Mismo instrumento que decide el rótulo del botón, para que
  // `planeador-crear-unidad-page.tsx` sepa desde el primer render (sin
  // esperar a que el docente elija un Grado) qué instrumento está creando y
  // pueda acotar sus `<Select>` de Grado/Asignatura a los de esa pestaña.
  const instrumentoActivo = tabActiva?.instrumento ?? unidadTabs[0]?.instrumento

  const filtered = React.useMemo(() => {
    const porInstrumento =
      tabActiva && tabActiva.gradoIds.length > 0
        ? unidades.filter((u) => u.gradoId != null && tabActiva.gradoIds.includes(u.gradoId))
        : unidades
    const term = buscar.trim().toLowerCase()
    if (!term) return porInstrumento
    return porInstrumento.filter((u) =>
      [u.nombre, u.area, u.asignatura, u.grado].join(" ").toLowerCase().includes(term),
    )
  }, [unidades, buscar, tabActiva])

  // Rótulo real (Regla 13) solo si TODAS las unidades filtradas lo
  // comparten — mismo criterio que `planeador-page.tsx`.
  const rotulosUnicos = new Set(filtered.map((u) => u.rotuloEjecucion).filter(Boolean))
  const rotuloLabel = rotulosUnicos.size === 1 ? [...rotulosUnicos][0]! : ROTULO_ACTIVIDAD_FALLBACK

  // Unidad abierta en el panel. Si la URL no trae ninguna —o trae una que ya
  // no está en la lista filtrada— se cae a la primera, para que la columna
  // derecha nunca quede vacía.
  const unidadIdNum = filtered.find((u) => String(u.id) === search.unidad)?.id ?? filtered[0]?.id
  const unidadId = unidadIdNum !== undefined ? String(unidadIdNum) : undefined
  // Unidad de otro docente (Coordinador viendo toda su sede): el panel
  // queda en solo lectura.
  const unidadAbiertaAjena = esAjena(filtered.find((u) => String(u.id) === unidadId))

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
            applyAlcance={applyAlcance}
            clearAllFilters={clearAllFilters}
            rotuloLabel={rotuloLabel}
            rotuloUnidad={rotuloUnidad}
          />
          {/* Misma distribución que en la pestaña "Actividades": el "Agregar…"
              con su "…" van pegados como un control partido y el exportar va
              al lado, así todas las acciones del listado quedan juntas. */}
          <TableScreenActions>
            {/* El rótulo sale del referente curricular (400 caracteres
                posibles) y el Button es `shrink-0`: sin `min-w-0` + tope y
                recorte, uno largo estiraba la barra entera fuera de pantalla. */}
            {/* Super Admin sin docente elegido: el estado vacío no ofrece
                  crear (mismo criterio que la pestaña de Actividades). */}
            {puedeCrear && !scope.requiereSeleccion && (
              <Button
                color="primary"
                size="sm"
                variant="fill"
                className="min-w-0 max-w-[18rem] shrink"
                aria-label={`Agregar ${tabLabel}`}
                title={`Agregar ${tabLabel}`}
                render={
                  <Link
                    to={paths.app.planeadorUnidadCrear.getHref()}
                    search={instrumentoActivo ? { instrumento: instrumentoActivo } : undefined}
                  />
                }
              >
                <PlusCircleIcon data-icon="inline-start" />
                <span className="truncate">Agregar {tabLabel}</span>
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    color="muted"
                    size="icon-sm"
                    disabled
                    aria-label={exportarLabel}
                  />
                }
              >
                <FileDownloadOutlinedIcon />
              </TooltipTrigger>
              <TooltipContent>{exportarLabel}</TooltipContent>
            </Tooltip>
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {/* Super Admin sin docente elegido: no hay planeador propio que
              mostrar, y ninguna consulta se dispara hasta elegir. */}
        {scope.requiereSeleccion ? (
          <PlaneadorSeleccionVacia />
        ) : (
          <>
            <PlaneadorLecturaBanner className="mb-4" />
            {/* La segunda pista va `minmax(0,1fr)` y no `1fr`: `1fr` equivale a
            `minmax(auto,1fr)`, que no baja del ancho mínimo del contenido, así
            que una tabla ancha empuja la columna en vez de scrollear dentro de
            su propio contenedor y desborda la pantalla. */}
            <div className="grid gap-6 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,210px)_minmax(0,1fr)]">
              {/* Rail izquierda. Mismo mecanismo que en la pestaña de Actividades:
              el contenido se saca del flujo desde `md` para que la altura de
              la fila la fije la columna derecha y la lista scrollee por dentro
              en vez de estirar la página. */}
              <section aria-label={`Listado de ${tabLabelPlural}`} className="relative min-h-0">
                <div className="flex flex-col gap-3 md:absolute md:inset-0">
                  <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                    {isPending && (
                      <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-8 text-sm">
                        <Spinner /> Cargando…
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
                        {buscar ? `Sin registros que coincidan con "${buscar}".` : "Sin registros."}
                      </div>
                    )}

                    {!isPending && !isError && filtered.length > 0 && (
                      <ul className="flex flex-col gap-2">
                        {filtered.map((unidad) => (
                          <li key={unidad.id}>
                            <PlaneadorSoloLecturaScope activo={esAjena(unidad)}>
                              <UnidadCard
                                unidad={unidad}
                                mostrarDocente={mostrarDocente}
                                rotuloUnidad={rotuloUnidad}
                                selected={String(unidad.id) === unidadId}
                                onSelect={() => setUnidadId(String(unidad.id))}
                                onEdit={() =>
                                  navigate({
                                    to: paths.app.planeadorUnidadEditar.getHref(String(unidad.id)),
                                    // Viaja para la miga de pan de la edición
                                    // (`planeadorUnidadEditarRoute`), que no
                                    // tiene de dónde más sacar el rótulo.
                                    search: { instrumento: rotuloUnidad },
                                  })
                                }
                                // Si la unidad borrada era la abierta en el panel,
                                // limpiamos `?unidad=` — mismo criterio que
                                // `onDeleted` del panel (cae a la primera de la
                                // lista filtrada).
                                onDeleted={() => {
                                  if (unidadId === String(unidad.id)) {
                                    navigate({
                                      to: planeadorUnidadesRoute.id,
                                      search: (prev) => ({ ...prev, unidad: undefined }),
                                      replace: true,
                                    })
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

              {/* Detalle. Se acota a la ventana y scrollea por dentro: si creciera
              libre arrastraría el alto de la fila —y con él el del rail, que
              se mide contra esa misma fila. */}
              <section
                aria-label={`Detalle ${deArticuloRotulo(rotuloUnidad)} ${tabLabel}`}
                className="min-w-0 md:h-[calc(100dvh-16rem)] md:min-h-0"
              >
                {unidadId ? (
                  <PlaneadorSoloLecturaScope activo={unidadAbiertaAjena}>
                    <UnidadDetallePanel
                      unidadId={unidadId}
                      rotuloUnidad={rotuloUnidad}
                      onDeleted={() =>
                        navigate({
                          to: planeadorUnidadesRoute.id,
                          search: (prev) => ({ ...prev, unidad: undefined }),
                          replace: true,
                        })
                      }
                    />
                  </PlaneadorSoloLecturaScope>
                ) : (
                  <div className="text-muted-foreground flex h-full items-center justify-center rounded-md border p-6 text-sm">
                    Seleccioná {articuloIndefinidoRotulo(rotuloUnidad)} {tabLabel} para ver su
                    detalle.
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
