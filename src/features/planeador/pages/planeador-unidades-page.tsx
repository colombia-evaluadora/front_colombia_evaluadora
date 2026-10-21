import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { PendingCreations } from "@/features/planeador/components/pending-creations"

import { PrepareOfflineButton } from "@/components/offline/prepare-offline-dialog"
import { Button } from "@/components/ui/button"
import { NoticeProvider } from "@/components/notice/notice-context"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { PlusCircleIcon } from "@/components/ui/icons"
import { LoadingLabel } from "@/components/offline/loading-label"
import { paths } from "@/config/paths"

import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { useActividadesTabsQuery } from "@/features/planeador/api/query/use-actividades-tabs-query"
import { ROTULO_ACTIVIDAD_FALLBACK } from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { DialogExportUnidades } from "@/features/planeador/components/dialogs/dialog-export-unidades"
import { SearchPlaneador } from "@/features/planeador/components/search/search-planeador"
import { PlaneadorTabs } from "@/features/planeador/components/planeador-tabs"
import { UnidadCard } from "@/features/planeador/components/unidad-card"
import { UnidadDetallePanel } from "@/features/planeador/components/unidad-detalle-panel"
import { useUnidadesFilters } from "@/features/planeador/hooks/use-planeador-filters"
import { useInstrumentoFiltroOptions } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
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
} from "@/features/planeador/components/planeador-docente-selector"
import { esAjena } from "@/features/planeador/lib/docente-dueno"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { getErrorMessage } from "@/lib/api-client"
import { useOfflineWritable } from "@/lib/offline/outbox/hooks"

/** Sin calendario: la unidad no es evento de un día. NoticeProvider debe ser ancestro de useNotify. */
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
  // Fase 3: con outbox, crear/editar unidades funciona sin red.
  const soloEnLinea = useOfflineWritable()
  // Los hooks de consulta leen el alcance (sede/año/jornada/docente) de la URL.
  const scope = usePlaneadorDocenteScope()
  const mostrarDocente = scope.puedeElegirDocente && scope.funcionario == null

  const buscar = search.buscar ?? ""
  // Cambiar sede/año/jornada/docente borra la pestaña y la unidad abierta.
  const { filters, applyFilters, clearAllFilters, activeFilterCount } =
    useUnidadesFilters()

  // Sin `?dia=`: filtrar por día ocultaba unidades enteras (Postman `planeador-delta-cambios`, punto g).
  const { data: instrumentoOptions = [] } = useInstrumentoFiltroOptions()
  const { data: unidadesResult, isPending, isError, error, refetch } = useUnidadesQuery()
  const unidades = unidadesResult?.rows ?? []

  // Con más de una pestaña (una por referente), se acota a los grados de la activa (`?instrumento=`).
  const { data: unidadTabs = [], error: errorTabs } = useUnidadesTabsQuery()
  // Errores de pestañas (p. ej. 42501) van al aviso; el rail pinta los suyos.
  useNotificarErrores([errorTabs])
  const tabActiva =
    unidadTabs.length > 1
      ? (unidadTabs.find((t) => t.instrumento === search.instrumento) ?? unidadTabs[0])
      : undefined

  // El rótulo varía por referente ("Unidad temática"/"Proyecto pedagógico"); `tabLabel` es la versión en minúscula.
  const rotuloUnidad = tabActiva?.instrumento ?? unidadTabs[0]?.instrumento ?? UNIDAD_TAB_FALLBACK
  const tabLabel = rotuloUnidad.toLowerCase()
  const tabLabelPlural = pluralizarRotulo(tabLabel)
  const exportarLabel = `Exportar ${tabLabelPlural} filtrad${terminacionRotulo(rotuloUnidad)}s`
  // Viaja al crear para acotar Grado/Asignatura desde el primer render.
  const instrumentoActivo = tabActiva?.instrumento ?? unidadTabs[0]?.instrumento

  const filtered = (() => {
    const porInstrumento =
      tabActiva && tabActiva.gradoIds.length > 0
        ? unidades.filter((u) => u.gradoId != null && tabActiva.gradoIds.includes(u.gradoId))
        : unidades
    // Estado/Instrumento no los recibe el backend; el listado llega completo (hasta 500, sso V488).
    const porFiltros = porInstrumento.filter(
      (u) =>
        (!filters.estado || u.status === filters.estado) &&
        (!filters.filtro || String(u.instrumentoId ?? "") === filters.filtro),
    )
    const term = buscar.trim().toLowerCase()
    if (!term) return porFiltros
    return porFiltros.filter((u) =>
      [u.nombre, u.area, u.asignatura, u.grado].join(" ").toLowerCase().includes(term),
    )
  })()

  // La lista se filtra en front, así que el export viaja como `IDS`.
  const exportFilters = {
    FUNCIONARIO: scope.funcionario,
    SEDE: scope.sedeId,
    PERIODO: scope.periodoId,
    IDS: filtered.map((u) => u.id),
  }
  const { data: actividadTabs = [] } = useActividadesTabsQuery()
  const referenteActivo = tabActiva?.referenteId ?? unidadTabs[0]?.referenteId ?? null
  const rotuloActividad =
    actividadTabs.find((t) => referenteActivo != null && t.referenteId === referenteActivo)?.rotulo ??
    (actividadTabs.length === 1 ? actividadTabs[0].rotulo : ROTULO_ACTIVIDAD_FALLBACK)
  const rotulosExport = { unidad: rotuloUnidad, actividades: pluralizarRotulo(rotuloActividad) }


  // Sin unidad válida en la URL se cae a la primera para no dejar el panel vacío.
  const unidadIdNum = filtered.find((u) => String(u.id) === search.unidad)?.id ?? filtered[0]?.id
  const unidadId = unidadIdNum !== undefined ? String(unidadIdNum) : undefined
  // Unidad de otro docente vista por Coordinador/Rector/Super Admin: solo lectura.
  // Para el docente es compartida (Regla 25): la usa, pero no la edita.
  const soloLecturaAjena = (unidad: UnidadTematica | undefined) => scope.puedeElegirDocente && esAjena(unidad)
  const unidadAbiertaAjena = soloLecturaAjena(filtered.find((u) => String(u.id) === unidadId))

  const setUnidadId = (next: string) =>
    navigate({
      to: planeadorUnidadesRoute.id,
      search: (prev) => ({ ...prev, unidad: next }),
      replace: true,
    })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle action={<PrepareOfflineButton />}>Planeador</TableScreenTitle>

        <PlaneadorTabs />

        <TableScreenToolbar>

          <SearchPlaneador
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            instrumentoOptions={instrumentoOptions}
            rotuloUnidad={rotuloUnidad}
          />
          <TableScreenActions>
            {/* Rótulo de hasta 400 caracteres: sin `min-w-0` + tope estiraba la barra fuera de pantalla. */}
            {puedeCrear && (
              <Button
                color="primary"
                size="sm"
                variant="fill"
                className="min-w-0 max-w-[18rem] shrink"
                aria-label={`Agregar ${tabLabel}`}
                title={soloEnLinea.tooltip ?? `Agregar ${tabLabel}`}
                disabled={soloEnLinea.disabled}
                nativeButton={soloEnLinea.disabled}
                render={
                  soloEnLinea.disabled ? undefined : <Link
                    to={paths.app.planeadorUnidadCrear.getHref()}
                    search={instrumentoActivo ? { instrumento: instrumentoActivo } : undefined}
                  />
                }
              >
                <PlusCircleIcon data-icon="inline-start" />
                <span className="truncate">Agregar {tabLabel}</span>
              </Button>
            )}
            <DialogExportUnidades
              label={exportarLabel}
              rotuloPlural={tabLabelPlural}
              filters={exportFilters}
              rotulos={rotulosExport}
              disabled={filtered.length === 0}
            />
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <PendingCreations tipo="unidad" />
      <TableScreenBody>
          <>
            <PlaneadorLecturaBanner className="mb-4" />
            {/* `minmax(0,1fr)` y no `1fr`: `1fr` no baja del ancho mínimo y una tabla ancha desborda. */}
            <div className="grid gap-6 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,210px)_minmax(0,1fr)]">
              {/* Fuera del flujo desde `md`: la altura la fija la columna derecha y el rail scrollea por dentro. */}
              <section aria-label={`Listado de ${tabLabelPlural}`} className="relative min-h-0">
                <div className="flex flex-col gap-3 md:absolute md:inset-0">
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
                        {buscar ? `Sin registros que coincidan con "${buscar}".` : "Sin registros."}
                      </div>
                    )}

                    {!isPending && !isError && filtered.length > 0 && (
                      <ul className="flex flex-col gap-2">
                        {filtered.map((unidad) => (
                          <li key={unidad.id}>
                            <PlaneadorSoloLecturaScope activo={soloLecturaAjena(unidad)}>
                              <UnidadCard
                                unidad={unidad}
                                mostrarDocente={mostrarDocente}
                                rotuloUnidad={rotuloUnidad}
                                selected={String(unidad.id) === unidadId}
                                onSelect={() => setUnidadId(String(unidad.id))}
                                onEdit={() =>
                                  navigate({
                                    to: paths.app.planeadorUnidadEditar.getHref(String(unidad.id)),
                                    // Para la miga de pan de la edición, que no tiene otra fuente del rótulo.
                                    search: { instrumento: rotuloUnidad },
                                  })
                                }
                                // Si se borró la abierta, limpiar `?unidad=` (cae a la primera).
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

              {/* Scroll interno: si creciera libre arrastraría el alto de la fila y del rail. */}
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
      </TableScreenBody>
    </TableScreen>
  )
}
