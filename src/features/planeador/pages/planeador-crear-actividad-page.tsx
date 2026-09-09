import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import { useCreateActividad } from "@/features/planeador/api/mutations/create-actividad"
import { EditarActividadForm } from "@/features/planeador/components/forms/form-editar-actividad"
import { crearActividadVacia } from "@/features/planeador/lib/empty-actividad"
import type { Actividad } from "@/features/planeador/api/types/actividad"

const FORM_ID = "crear-actividad-form"

/**
 * Alta de una actividad en una ruta aparte — mismo patrón que la edición
 * (`planeador-editar-actividad-page.tsx`): mismo `<TableScreen>`, mismo
 * `EditarActividadForm` (que ahora acepta un `onSubmit` justo para este
 * caso: la edición todavía no tiene `useUpdateActividad`, pero el alta ya
 * manda la actividad completa a `useCreateActividad`).
 *
 * A diferencia de editar, el footer no espera a que el form esté "dirty"
 * para mostrar el aviso + el botón: un form en blanco nunca arranca
 * "guardado", así que siempre hay algo que confirmar (mismo criterio que
 * `add-establishment-page`).
 */
export function PlaneadorCrearActividadPage() {
  return (
    <NoticeProvider>
      <PlaneadorCrearActividadPageContent />
    </NoticeProvider>
  )
}

function PlaneadorCrearActividadPageContent() {
  const navigate = useNavigate()
  const { notify } = useNotify()
  // Lazy initializer: se arma UNA sola vez al montar la página, no en cada
  // render — si no, cada re-render generaría una actividad (y unos ids)
  // distintos y el form perdería lo que el usuario ya tipeó.
  const [actividad] = useState(() => crearActividadVacia())

  const createMutation = useCreateActividad({
    mutationConfig: {
      onSuccess: () => {
        notify("Actividad creada correctamente.")
        navigate({ to: paths.app.planeadorActividades.getHref() })
      },
      onError: () => {
        notify("No se pudo crear la actividad.", { variant: "error" })
      },
    },
  })

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
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody className="rounded-b-none border-b-0">
        <EditarActividadForm
          actividad={actividad}
          formId={FORM_ID}
          esNueva
          onSubmit={(values: Actividad) => createMutation.mutate(values)}
        />
      </TableScreenBody>

      <TableScreenFooter>
        <p className="text-sm">Completa los datos y guarda para crear la actividad.</p>
        <Button
          type="submit"
          form={FORM_ID}
          color="primary"
          variant="fill"
          size="sm"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <SpinnerIcon data-icon="inline-start" className="animate-spin" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          {createMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </TableScreenFooter>
    </TableScreen>
  )
}
