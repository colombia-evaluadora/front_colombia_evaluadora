import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { PlusCircleIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { isNotFoundError } from "@/lib/api-client"

import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { EditarActividadForm } from "@/features/planeador/components/forms/form-editar-actividad"

/**
 * Edición de una actividad en una ruta aparte (no in-place en el panel).
 *
 * Mismo `<TableScreen>` que el resto de las pantallas de gestión: encabezado
 * con el título "Planeador" a la izquierda y la acción principal a la derecha
 * —acá "Cerrar", que devuelve al listado sin guardar—.
 *
 * El formulario carga la actividad vía `useActividadDetalleQuery`: la página
 * pasa esos datos al form como `defaultValues`, así se rellena apenas carga
 * la pantalla. La mutación real queda fuera de esta iteración: los inputs
 * son editables visualmente, pero no hay endpoint ni `useUpdate` todavía.
 */
export function PlaneadorEditarActividadPage() {
  const navigate = useNavigate()
  const { actividadId } = useParams({ strict: false }) as { actividadId?: string }

  const { data: actividad, isPending, isError, error } = useActividadDetalleQuery(actividadId)

  if (!actividadId) {
    return (
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle>Planeador</TableScreenTitle>
        </TableScreenHeader>
        <TableScreenBody>
          <p className="text-muted-foreground px-6 py-12 text-center text-sm">
            Falta el identificador de la actividad.
          </p>
        </TableScreenBody>
      </TableScreen>
    )
  }

  if (isNotFoundError(error)) {
    return <NotFoundPage />
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              color="primary"
              size="sm"
              variant="fill"
              render={<Link to={paths.app.planeadorActividades.getHref()} />}
            >
              <PlusCircleIcon data-icon="inline-start" />
              Cerrar
            </Button>
          }
        >
          Planeador
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        {isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando actividad…
          </div>
        )}

        {isError && !isNotFoundError(error) && (
          <p className="text-red px-6 py-12 text-center text-sm">
            Ocurrió un error al cargar la actividad.
          </p>
        )}

        {actividad && (
          <EditarActividadForm
            key={actividad.id}
            actividad={actividad}
            onCancel={() => navigate({ to: paths.app.planeadorActividades.getHref() })}
          />
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
