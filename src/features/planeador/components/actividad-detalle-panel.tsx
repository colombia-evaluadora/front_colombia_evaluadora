import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, ClipboardCheckIcon, EyeIcon, PencilIcon, CheckSquareOffsetIcon } from "@/components/ui/icons"
import { LoadingLabel } from "@/components/offline/loading-label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"

import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { CalificacionesAprobacionView } from "@/features/planeador/components/calificaciones-aprobacion-view"
import { CalificacionesView } from "@/features/planeador/components/calificaciones-view"
import { DetailSections } from "@/features/planeador/components/detail-sections"
import { DialogDeleteActividad } from "@/features/planeador/components/dialogs/dialog-delete-actividad"
import { ValidacionCoordinadorFooter } from "@/features/planeador/components/validacion-coordinador"
import { esActividadFormativa } from "@/features/planeador/lib/actividad-formativa"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"
import { getErrorMessage } from "@/lib/api-client"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { motivoNoEditable } from "@/features/planeador/lib/actividad-editable"

const ACCIONES = [
  { id: "marcar", label: "Marcar", Icon: CheckSquareOffsetIcon },
  { id: "aprobar", label: "Aprobar", Icon: ClipboardCheckIcon },
] as const

// "Marcar" se muestra como "Registrar resultados"; "Aprobar" nunca aplica a formativa.
function labelFor(id: string, label: string): string {
  if (id === "marcar") return "Registrar resultados"
  if (id === "aprobar") return "Calificar múltiple"
  return label
}

interface ActividadDetallePanelProps {
  actividadId: number
  /** "info" detalle, "grades" calificaciones (Marcar), "approval" aprobación bulk (Aprobar). */
  mode: "info" | "grades" | "approval"
  /** Cierra el panel y devuelve el calendario a la columna derecha. */
  onClose: () => void
  /** Pasa a `mode="grades"` (chulito Marcar). */
  onShowGrades: () => void
  /** Pasa a `mode="approval"` (Aprobar). */
  onShowApproval: () => void
}

/** Detalle embebido en lugar del calendario; consulta `/detalle/:id` porque el listado no trae todas las secciones. */
export function ActividadDetallePanel({
  actividadId,
  mode,
  onClose,
  onShowGrades,
  onShowApproval,
}: ActividadDetallePanelProps) {
  // Plan offline §8.8: en `?modo=approval` se puede revisar sin red, no decidir.
  const aprobacionSinRed = useOnlineOnly(
    "Las aprobaciones necesitan conexión. Puedes revisarlas, pero no decidir sin internet.",
  )
  const { data: actividad, isPending, isError, error, refetch } = useActividadDetalleQuery(actividadId)
  const { puedeEditar, puedeVer, soloLectura, viendoOtroDocente } = usePlaneadorSoloLectura()
  // Solo lectura (Coordinador o Regla 37): el link abre sin editar. Planeador de otro docente: sin link,
  // la edición no conoce `?docente=` y a un Super Admin le abriría el form editable.
  const bloqueoEdicion = motivoNoEditable(actividad)
  const editable = puedeEditar && !bloqueoEdicion
  const accionEditar = editable ? "Editar" : puedeEditar || (puedeVer && !viendoOtroDocente) ? "Ver" : null
  const tooltipEditar = bloqueoEdicion && puedeEditar
    ? bloqueoEdicion
    : actividad
      ? `${accionEditar} ${actividad.nombre}`
      : accionEditar

  return (
    // `flex-1` y no `h-full`: el padre acota con `max-h`, contra el que `height: 100%` no resuelve.
    <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-card">
      <div className="bg-muted/10 flex items-center justify-between gap-2 border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
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
          {/* Label con el nombre para distinguir la actividad; mientras carga queda "Editar". */}
          {accionEditar && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    nativeButton={false}
                    render={<Link to={paths.app.planeadorActividadEditar.getHref(String(actividadId))} />}
                    aria-label={actividad ? `${accionEditar} ${actividad.nombre}` : accionEditar}
                  />
                }
              >
                {editable ? <PencilIcon /> : <EyeIcon />}
              </TooltipTrigger>
              <TooltipContent>{tooltipEditar}</TooltipContent>
            </Tooltip>
          )}
          {ACCIONES.filter(
            (a) =>
              // Paréntesis explícitos: sin ellos el `||` mostraba Marcar/Aprobar en solo lectura.
              !soloLectura &&
              // "Aprobar" no aplica en preescolar: "Marcar" ya cubre observación + asistencia.
              (a.id !== "aprobar" || !actividad || !esActividadFormativa(actividad)),
          ).map(({ id, label, Icon }) => {
            const handler =
              id === "marcar"
                ? onShowGrades
                : id === "aprobar"
                  ? onShowApproval
                  : undefined
            const displayLabel = labelFor(id, label)
            const labelConNombre = actividad ? `${displayLabel} ${actividad.nombre}` : displayLabel
            return (
              <Tooltip key={id}>
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
          {/* Solo con la actividad cargada (el dialog necesita el nombre); al terminar, `onClose` vuelve al calendario. */}
          {actividad && (
            <DialogDeleteActividad actividad={actividad} onDeleted={onClose} />
          )}
        </div>
      </div>

      {/* Header fijo; solo scrollea el contenido. */}
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-3">
        {isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <LoadingLabel>Cargando…</LoadingLabel>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-red text-sm">{getErrorMessage(error)}</p>
            <Button variant="outline" color="neutral" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {actividad && (
          // `?modo=grades|approval` puede llegar escrito a mano en la URL:
          // en solo lectura se ignora y se muestra el detalle.
          mode === "grades" && !soloLectura ? (
            <CalificacionesView actividad={actividad} />
          ) : mode === "approval" && !soloLectura ? (
            <>
              {aprobacionSinRed.disabled && (
                <p role="status" className="mb-3 rounded-md bg-navy-22 px-3 py-2 text-sm text-navy">
                  {aprobacionSinRed.reason}
                </p>
              )}
              <CalificacionesAprobacionView actividad={actividad} />
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <DetailSections actividad={actividad} />
            </div>
          )
        )}
      </div>

      {/* Fuera del scroll: como sticky dejaba un hueco por el que asomaba el contenido. */}
      {actividad && !((mode === "grades" || mode === "approval") && !soloLectura) && (
        <ValidacionCoordinadorFooter
          className="static rounded-b-md"
          actividadId={actividad.id}
          requiereValidacion={actividad.requiereValidacion}
        />
      )}
    </div>
  )
}
