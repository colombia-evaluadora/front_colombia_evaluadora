import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
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
import { useUpdateMaterialesActividad } from "@/features/planeador/api/mutations/update-materiales-actividad"
import {
  tieneDefinicionInstrumento,
  useUpdateInstrumentoActividad,
} from "@/features/planeador/api/mutations/update-instrumento-actividad"
import { useUpdateAdaptacionesActividad } from "@/features/planeador/api/mutations/update-adaptaciones-actividad"
import { useAgregarCriterioUnidadActividad } from "@/features/planeador/api/mutations/agregar-criterio-unidad-actividad"
import { EditarActividadForm } from "@/features/planeador/components/forms/form-editar-actividad"
import { crearActividadVacia } from "@/features/planeador/lib/empty-actividad"
import type { Actividad } from "@/features/planeador/api/types/actividad"

const FORM_ID = "crear-actividad-form"

/**
 * Alta de una actividad en una ruta aparte — mismo patrón que la edición
 * (`planeador-editar-actividad-page.tsx`): mismo `<TableScreen>`, mismo
 * `EditarActividadForm` (que ahora acepta un `onSubmit` justo para este
 * caso: la edición todavía no tiene `useUpdateActividad`, pero el alta ya
 * manda la actividad completa a `useCreateActividad`), y el mismo criterio
 * de footer sticky: el aviso + "Guardar" solo aparecen cuando hay cambios
 * sin guardar (`isDirty`, vía `onDirtyChange` del form).
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
  const [isDirty, setIsDirty] = useState(false)
  // Lazy initializer: se arma UNA sola vez al montar la página, no en cada
  // render — si no, cada re-render generaría una actividad (y unos ids)
  // distintos y el form perdería lo que el usuario ya tipeó.
  const [actividad] = useState(() => crearActividadVacia())

  const createMutation = useCreateActividad({
    mutationConfig: {
      onError: () => {
        notify("No se pudo crear la actividad.", { variant: "error" })
      },
    },
  })
  const updateMateriales = useUpdateMaterialesActividad({
    mutationConfig: {
      // Los materiales son un segundo paso, aparte de crear la actividad
      // (ver el comentario de `create-actividad.ts`): si este PUT falla, la
      // actividad YA quedó creada — se avisa aparte en vez de tratarlo como
      // si la creación entera hubiera fallado.
      onError: () => {
        notify("La actividad se creó, pero no se pudieron guardar sus materiales de apoyo.", {
          variant: "error",
        })
      },
    },
  })
  const updateInstrumento = useUpdateInstrumentoActividad({
    mutationConfig: {
      onError: () => {
        notify("La actividad se creó, pero no se pudo guardar la definición del instrumento.", {
          variant: "error",
        })
      },
    },
  })
  const updateAdaptaciones = useUpdateAdaptacionesActividad({
    mutationConfig: {
      onError: () => {
        notify("La actividad se creó, pero no se pudieron guardar sus adaptaciones curriculares.", {
          variant: "error",
        })
      },
    },
  })
  // Cada criterio de la unidad marcado es su propio `POST` — no hay bulk
  // confirmado (mismo criterio que `agregarEvidencia` en la página de
  // edición).
  const agregarCriterio = useAgregarCriterioUnidadActividad({
    mutationConfig: {
      onError: () =>
        notify("La actividad se creó, pero no se pudieron relacionar todos los criterios de la unidad.", {
          variant: "error",
        }),
    },
  })

  async function handleSubmit(values: Actividad) {
    let id: number
    try {
      ;({ id } = await createMutation.mutateAsync(values))
    } catch {
      return // `onError` de `createMutation` ya avisó.
    }

    // Materiales e instrumento son pasos APARTE (rutas dedicadas, ver sus
    // comentarios): si alguno falla, la actividad YA quedó creada — se
    // avisa con su propio `onError` y de todos modos se navega, en vez de
    // dejar al docente varado en un form cuya actividad ya existe.
    let recursosOmitidos: string[] = []
    if (values.recursos.length > 0) {
      try {
        ;({ recursosOmitidos } = await updateMateriales.mutateAsync({ actividadId: id, recursos: values.recursos }))
      } catch {
        // `onError` de `updateMateriales` ya avisó.
      }
    }
    if (values.esEvaluativa && tieneDefinicionInstrumento(values)) {
      try {
        await updateInstrumento.mutateAsync({ actividadId: id, actividad: values })
      } catch {
        // `onError` de `updateInstrumento` ya avisó.
      }
    }
    if (values.adaptaciones.length > 0) {
      try {
        await updateAdaptaciones.mutateAsync({ actividadId: id, adaptaciones: values.adaptaciones })
      } catch {
        // `onError` de `updateAdaptaciones` ya avisó.
      }
    }
    for (const criterioUnidadId of values.criteriosUnidadIds) {
      agregarCriterio.mutate({ actividadId: id, criterioUnidadId })
    }

    if (recursosOmitidos.length > 0) {
      queueNotice(
        `Actividad creada. No se guardaron estos materiales de tipo "Archivo" (todavía no hay carga de archivos): ${recursosOmitidos.join(", ")}.`,
        { variant: "error" },
      )
    } else {
      // `navigate` deja el Planeador — un `notify()` acá se perdería con
      // el `NoticeProvider` de esta pantalla al desmontarse.
      queueNotice("Actividad creada correctamente.")
    }
    navigate({ to: paths.app.planeadorActividades.getHref() })
  }

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
          onDirtyChange={setIsDirty}
          onSubmit={handleSubmit}
        />
      </TableScreenBody>

      <TableScreenFooter>
        {isDirty ? (
          <>
            <p className="text-sm">Completa los datos y guarda para crear la actividad.</p>
            <Button
              type="submit"
              form={FORM_ID}
              color="primary"
              variant="fill"
              size="sm"
              disabled={
                createMutation.isPending ||
                updateMateriales.isPending ||
                updateInstrumento.isPending ||
                updateAdaptaciones.isPending
              }
            >
              {createMutation.isPending ||
              updateMateriales.isPending ||
              updateInstrumento.isPending ||
              updateAdaptaciones.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {createMutation.isPending ||
              updateMateriales.isPending ||
              updateInstrumento.isPending ||
              updateAdaptaciones.isPending
                ? "Guardando..."
                : "Guardar"}
            </Button>
          </>
        ) : (
          <span />
        )}
      </TableScreenFooter>
    </TableScreen>
  )
}
