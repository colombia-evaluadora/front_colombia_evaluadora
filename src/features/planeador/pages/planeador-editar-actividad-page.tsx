import { useState } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { isNotFoundError } from "@/lib/api-client"

import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { EditarActividadForm } from "@/features/planeador/components/forms/form-editar-actividad"

const FORM_ID = "editar-actividad-form"

/**
 * Edición de una actividad en una ruta aparte (no in-place en el panel).
 *
 * Mismo `<TableScreen>` que el resto de las pantallas de gestión, con un
 * `<TableScreenFooter>` sticky al pie: el aviso + el botón "Guardar" solo
 * aparecen cuando hay cambios sin guardar (mismo patrón que el editar de
 * Establecimiento Educativo).
 *
 * El form carga la actividad vía `useActividadDetalleQuery`. La mutación
 * real queda fuera de esta iteración: los inputs son editables visualmente,
 * pero no hay endpoint ni `useUpdate` todavía.
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
    <EditarActividadPageContent
      isPending={isPending}
      isError={isError}
      actividad={actividad}
      onClose={() => navigate({ to: paths.app.planeadorActividades.getHref() })}
    />
  )
}

function EditarActividadPageContent({
  isPending,
  isError,
  actividad,
  onClose,
}: {
  isPending: boolean
  isError: boolean
  actividad: ReturnType<typeof useActividadDetalleQuery>["data"]
  onClose: () => void
}) {
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              color="neutral"
              size="sm"
              variant="fill"
              render={<Link to={paths.app.planeadorActividades.getHref()} />}
            >
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

        {isError && (
          <p className="text-red px-6 py-12 text-center text-sm">
            Ocurrió un error al cargar la actividad.
          </p>
        )}

        {actividad && (
          <EditarActividadForm
            key={actividad.id}
            actividad={actividad}
            formId={FORM_ID}
            onDirtyChange={setIsDirty}
          />
        )}
      </TableScreenBody>

      {/* El footer es el que avisa y guarda; aparece solo cuando hay cambios.
          Sigue el patrón de `add-establishment-page`: siempre está montado
          (preserva el layout del `TableScreen`), pero su contenido solo
          pinta el aviso + el Guardar cuando `isDirty`. */}
      <TableScreenFooter
        // `rounded-b-none` y `border-b-0` para que el footer se pegue al
        // borde inferior sin que aparezca la curva superior/inferior de la
        // caja —es continuo con el body, no una pieza suelta.
        className="rounded-b-none border-b-0"
      >
        {isDirty ? (
          <>
            <p className="text-sm">Se detectaron cambios. Guardar para conservar la información.</p>
            <Button
              type="submit"
              form={FORM_ID}
              color="primary"
              variant="fill"
              size="sm"
              disabled={isSaving}
              onClick={() => {
                // Stub de guardado: cuando exista `useUpdateActividad`,
                // acá arranca la mutación y se setea isSaving en consecuencia.
                setIsSaving(true)
                setTimeout(() => {
                  setIsSaving(false)
                  setIsDirty(false)
                  onClose()
                }, 300)
              }}
            >
              {isSaving ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </>
        ) : (
          <span />
        )}
      </TableScreenFooter>
    </TableScreen>
  )
}
