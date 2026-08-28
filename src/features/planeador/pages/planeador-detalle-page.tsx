import { Link, useParams } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardCheckIcon,
  FileDownloadOutlinedIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"

import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { DetailSections } from "@/features/planeador/components/detail-sections"

/**
 * Drill-down de una actividad. Toolbar de 5 acciones arriba, todas
 * `disabled` en esta iteración (read-only visual).
 */
export function PlaneadorDetallePage() {
  const { actividadId } = useParams({ strict: false }) as { actividadId?: string }
  const { data: actividad, isPending, isError, refetch } = useActividadDetalleQuery(actividadId)

  return (
    <TableScreen>
      <TableScreenHeader>
        <Button
          variant="ghost"
          color="neutral"
          size="sm"
          className="w-fit"
          render={<Link to={paths.app.planeadorActividades.getHref()} />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver al Planeador
        </Button>

        {isPending ? (
          <TableScreenTitle>Planeador · …</TableScreenTitle>
        ) : isError || !actividad ? (
          <TableScreenTitle>Planeador · Actividad no encontrada</TableScreenTitle>
        ) : (
          <div className="flex flex-col gap-1">
            <TableScreenTitle>{actividad.nombre}</TableScreenTitle>
            <p className="text-muted-foreground text-sm">
              {actividad.asignatura} {actividad.grado} {actividad.grupo} ·{" "}
              {actividad.unidad.nombre} · {actividad.tipo}
            </p>
          </div>
        )}

        {/* Toolbar de acciones — todas deshabilitadas en esta iteración. */}
        <div className="flex items-center gap-1 rounded-md border bg-card p-1">
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            render={
              actividadId
                ? <Link to={paths.app.planeadorActividadEditar.getHref(actividadId)} />
                : <button type="button" disabled />
            }
            aria-label="Editar"
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            disabled
            aria-label="Marcar"
          >
            <CheckIcon />
          </Button>
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            disabled
            aria-label="Aprobar"
          >
            <ClipboardCheckIcon />
          </Button>
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            disabled
            aria-label="Descargar"
          >
            <FileDownloadOutlinedIcon />
          </Button>
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            disabled
            aria-label="Eliminar"
          >
            <TrashIcon />
          </Button>
        </div>
      </TableScreenHeader>

      <TableScreenBody>
        {isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando actividad…
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-red text-sm">
              Ocurrió un error al cargar la actividad.
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

        {actividad && <DetailSections actividad={actividad} />}
      </TableScreenBody>
    </TableScreen>
  )
}