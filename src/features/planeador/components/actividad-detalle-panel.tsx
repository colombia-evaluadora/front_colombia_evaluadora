import { Button } from "@/components/ui/button"
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardCheckIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"

import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { CalificacionesAprobacionView } from "@/features/planeador/components/calificaciones-aprobacion-view"
import { CalificacionesView } from "@/features/planeador/components/calificaciones-view"
import { DetailSections } from "@/features/planeador/components/detail-sections"

const ACCIONES = [
  { label: "Editar", Icon: PencilIcon },
  { label: "Marcar", Icon: CheckIcon },
  { label: "Aprobar", Icon: ClipboardCheckIcon },
  // "Descargar" NO va acá: el export por actividad ya vive en la card
  // (botón conectado a `useExportarActividadesJson`, el mismo endpoint
  // JSON del "Exportar todo" del toolbar). Tenerlo también en el header
  // del panel dejaba dos disparadores de exportación en la misma
  // pantalla, y el del panel no tenía handler.
  { label: "Eliminar", Icon: TrashIcon },
] as const

interface ActividadDetallePanelProps {
  actividadId: number
  /** Vista activa del panel: "info" muestra las secciones de detalle;
   * "grades" muestra la tabla de calificaciones con notas por criterio
   * (chulito "Marcar"); "approval" muestra la aprobación bulk por
   * estudiante con instrumento/Diseño/Modalidad (clipboard-check
   * "Aprobar"). El click en la card activa "info". */
  mode: "info" | "grades" | "approval"
  /** Cierra el panel y devuelve el calendario a la columna derecha. */
  onClose: () => void
  /** Cambia el panel a la vista de calificaciones (`mode="grades"`).
   * Lo dispara el chulito (Marcar) del propio panel. */
  onShowGrades: () => void
  /** Cambia el panel a la vista de aprobación (`mode="approval"`).
   * Lo dispara el clipboard-check (Aprobar) del propio panel. */
  onShowApproval: () => void
}

/**
 * Detalle de una actividad como panel embebido: ocupa el lugar del calendario
 * en la columna derecha del Planeador cuando hay una card seleccionada.
 *
 * Trae su propia consulta en vez de recibir la actividad ya resuelta: el
 * listado devuelve la actividad "de tarjeta" (nombre, fechas, unidad) y el
 * detalle tiene secciones que solo llegan por `/detalle/:id`.
 *
 * Tiene tres vistas según de dónde se llegó:
 * - `mode="info"` (click en la card): las secciones informativas
 *   (Identificación, Programación, Materiales, Recursos, Evaluación,
 *   Rúbrica, Observaciones, Adaptaciones) — read-only.
 * - `mode="grades"` (chulito "Marcar" de la card): la tabla de
 *   calificaciones con asistencia y notas por criterio.
 * - `mode="approval"` (clipboard-check "Aprobar" de la card): la
 *   aprobación bulk por estudiante con instrumento / Diseño / Modalidad.
 *
 * Las cinco acciones del header siguen el mismo patrón que la card: las
 * tres vivas son Editar (link al form), Marcar (cambia el modo del
 * panel) y Aprobar (idem). Eliminar sigue deshabilitado; el export por
 * actividad vive solo en la card.
 */
export function ActividadDetallePanel({
  actividadId,
  mode,
  onClose,
  onShowGrades,
  onShowApproval,
}: ActividadDetallePanelProps) {
  const { data: actividad, isPending, isError, refetch } = useActividadDetalleQuery(actividadId)

  return (
    // `flex-1`, no `h-full`: el padre (`planeador-page.tsx`) acota esta
    // columna con `max-h`, no `h` — un `height: 100%` acá no siempre
    // resuelve contra eso (necesita un alto definido, no una cota), y
    // `flex-1` sí funciona igual de bien. Fuera de un contenedor flex
    // (mobile, sin el `md:flex` del padre) `flex-1` no hace nada, así que
    // no hace falta condicionarlo a `md:`.
    <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-card">
      {/* `bg-muted/10`: el mismo fondo que `TableScreenTitle` le da al
          encabezado de la pantalla, para que el header del panel se lea como
          parte del mismo sistema. */}
      <div className="bg-muted/10 flex items-center justify-between gap-2 border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
          {/* `icon-sm` es el tamaño de los botones de acción de las filas de
              tabla: el icono ES el control, no acompaña a un texto. El
              `size-6` explícito pisa el `size-5` del preset —la base lo
              permite con `:not([class*='size-'])`— para que la flecha no
              quede chica al lado del título en negrita. */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Cerrar detalle"
                />
              }
            >
              <ArrowLeftIcon className="size-6" />
            </TooltipTrigger>
            <TooltipContent>Cerrar detalle</TooltipContent>
          </Tooltip>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">
              {actividad?.nombre ?? "Cargando…"}
            </h2>
            {actividad && (
              <p className="text-muted-foreground text-xs">
                {actividad.asignatura} {actividad.grado} {actividad.grupo} ·{" "}
                {actividad.unidad.nombre} · {actividad.tipo}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {/* Editar navega a la ruta de edición propia; Marcar cambia el panel
              a la vista de calificaciones; las demás siguen deshabilitadas
              (sin endpoints en esta iteración). El nombre de la actividad se
              suma al label ("Editar {nombre}") — mismo criterio que
              `ActividadCard`: "Editar" a secas no distingue nada cuando el
              panel puede reabrirse con cualquier actividad. Mientras carga
              (`actividad` todavía `undefined`) cae al label a secas. */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  render={<Link to={paths.app.planeadorActividadEditar.getHref(String(actividadId))} />}
                  aria-label={actividad ? `Editar ${actividad.nombre}` : "Editar"}
                />
              }
            >
              <PencilIcon />
            </TooltipTrigger>
            <TooltipContent>{actividad ? `Editar ${actividad.nombre}` : "Editar"}</TooltipContent>
          </Tooltip>
          {ACCIONES.filter((a) => a.label !== "Editar").map(({ label, Icon }) => {
            const handler =
              label === "Marcar"
                ? onShowGrades
                : label === "Aprobar"
                  ? onShowApproval
                  : undefined
            const labelConNombre = actividad ? `${label} ${actividad.nombre}` : label
            return (
              <Tooltip key={label}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      color="neutral"
                      size="icon-sm"
                      disabled={!handler}
                      onClick={handler}
                      aria-label={labelConNombre}
                    />
                  }
                >
                  <Icon />
                </TooltipTrigger>
                <TooltipContent>{labelConNombre}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>

      {/* Mismo patrón que el rail: el header queda fijo y solo scrollea el
          contenido, con la scrollbar delgada de las tablas. */}
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-3">
        {isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando actividad…
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-red text-sm">Ocurrió un error al cargar la actividad.</p>
            <Button variant="outline" color="neutral" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {actividad && (
          mode === "grades" ? (
            <CalificacionesView actividad={actividad} />
          ) : mode === "approval" ? (
            <CalificacionesAprobacionView actividad={actividad} />
          ) : (
            <DetailSections actividad={actividad} />
          )
        )}
      </div>
    </div>
  )
}
