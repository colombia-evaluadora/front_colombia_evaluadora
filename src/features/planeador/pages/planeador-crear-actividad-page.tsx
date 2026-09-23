import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"

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
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"

import { useCreateActividad } from "@/features/planeador/api/mutations/create-actividad"
import { useUpdateMaterialesActividad } from "@/features/planeador/api/mutations/update-materiales-actividad"
import {
  tieneDefinicionInstrumento,
  useUpdateInstrumentoActividad,
} from "@/features/planeador/api/mutations/update-instrumento-actividad"
import { useUpdateAdaptacionesActividad } from "@/features/planeador/api/mutations/update-adaptaciones-actividad"
import { useAgregarCriterioUnidadActividad } from "@/features/planeador/api/mutations/agregar-criterio-unidad-actividad"
import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { EditarActividadForm } from "@/features/planeador/components/forms/form-editar-actividad"
import { crearActividadVacia } from "@/features/planeador/lib/empty-actividad"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

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

  // `unidadId` llega cuando se abre esta pantalla desde "Agregar actividad"
  // dentro de una Unidad temática (`DialogAgregarActividad`); `fechaInicio`/
  // `fechaCierre` cuando se abre desde un clic en una celda del calendario
  // mensual (`PlaneadorMonthGrid` vía `planeador-page.tsx`) — ver
  // `planeadorActividadCrearSearchSchema`. `strict: false` porque esta
  // página también se monta sin ningún search (desde "Nueva actividad" del
  // listado general).
  const { unidadId, fechaInicio, fechaCierre } = useSearch({ strict: false }) as {
    unidadId?: string
    fechaInicio?: string
    fechaCierre?: string
  }
  // Mismo listado que ya usa `EditarActividadForm` para "Unidad temática
  // asociada" — se reusa acá solo para resolver `grado`/`asignatura` (los
  // NOMBRES; `UnidadTematica.gradoId`/`.asignaturaId` casi nunca vienen del
  // backend real, ver su comentario) de la unidad que se preselecciona.
  const { data: unidadesResult, isPending: isPendingUnidades } = useUnidadesQuery()
  const unidadPreseleccionada: UnidadTematica | undefined = unidadId
    ? unidadesResult?.rows.find((u) => String(u.id) === unidadId)
    : undefined
  // Sin `unidadId` en la URL no hace falta esperar nada — el form arranca
  // en blanco de una, como siempre. CON `unidadId`, hay que esperar a que
  // el listado cargue antes de armar la actividad inicial: si se monta
  // `EditarActividadForm` antes, `useForm({ defaultValues })` ya leyó un
  // `actividad` sin la unidad (se lee UNA sola vez al montar).
  const esperandoPreseleccion = Boolean(unidadId) && isPendingUnidades

  const createMutation = useCreateActividad({
    mutationConfig: {
      // El motivo real lo manda el backend (una validación del planeador es
      // accionable: qué instrumento no aplica, qué unidad lo impide). Mismo
      // criterio que la página de editar, que ya mostraba `getErrorMessage`.
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })
  const updateMateriales = useUpdateMaterialesActividad({
    mutationConfig: {
      // Los materiales son un segundo paso, aparte de crear la actividad
      // (ver el comentario de `create-actividad.ts`): si este PUT falla, la
      // actividad YA quedó creada — se avisa aparte en vez de tratarlo como
      // si la creación entera hubiera fallado.
      onError: (error) => {
        notify(`La actividad se creó, pero no se pudieron guardar sus materiales de apoyo: ${getErrorMessage(error)}`, {
          variant: "error",
        })
      },
    },
  })
  const updateInstrumento = useUpdateInstrumentoActividad({
    mutationConfig: {
      onError: (error) => {
        notify(`La actividad se creó, pero no se pudo guardar la definición del instrumento: ${getErrorMessage(error)}`, {
          variant: "error",
        })
      },
    },
  })
  const updateAdaptaciones = useUpdateAdaptacionesActividad({
    mutationConfig: {
      onError: (error) => {
        notify(
          `La actividad se creó, pero no se pudieron guardar sus adaptaciones curriculares: ${getErrorMessage(error)}`,
          { variant: "error" },
        )
      },
    },
  })
  // Cada criterio de la unidad marcado es su propio `POST` — no hay bulk
  // confirmado (mismo criterio que `agregarEvidencia` en la página de
  // edición).
  const agregarCriterio = useAgregarCriterioUnidadActividad({
    mutationConfig: {
      onError: (error) =>
        notify(
          `La actividad se creó, pero no se pudieron relacionar todos los criterios de la unidad: ${getErrorMessage(error)}`,
          { variant: "error" },
        ),
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
        `Actividad creada. No se guardaron estos materiales de tipo "Archivo" (sin un archivo cargado): ${recursosOmitidos.join(", ")}.`,
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
        {esperandoPreseleccion ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando…
          </div>
        ) : (
          <CrearActividadForm
            unidadPreseleccionada={unidadPreseleccionada}
            fechaInicio={fechaInicio}
            fechaCierre={fechaCierre}
            formId={FORM_ID}
            onDirtyChange={setIsDirty}
            onSubmit={handleSubmit}
          />
        )}
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

/**
 * Separado de `PlaneadorCrearActividadPageContent` solo para que el
 * `useState` de más abajo (lazy initializer, corre UNA sola vez al montar)
 * lea `unidadPreseleccionada` YA resuelta: el padre no monta este
 * componente hasta que `esperandoPreseleccion` es `false` (ver su
 * `TableScreenBody`), así que acá siempre llega con el valor final —
 * nunca con el `undefined` transitorio de mientras carga.
 */
function CrearActividadForm({
  unidadPreseleccionada,
  fechaInicio,
  fechaCierre,
  formId,
  onDirtyChange,
  onSubmit,
}: {
  unidadPreseleccionada: UnidadTematica | undefined
  /** `yyyy-MM-dd` — llega desde un clic en el calendario mensual (ver
   *  `onDayClick` en `planeador-page.tsx`). */
  fechaInicio?: string
  fechaCierre?: string
  formId: string
  onDirtyChange: (dirty: boolean) => void
  onSubmit: (values: Actividad) => void | Promise<void>
}) {
  const [actividad] = useState(() => {
    let base = crearActividadVacia()
    if (unidadPreseleccionada) {
      // `grado`/`asignatura` (los NOMBRES) y la unidad misma siempre viajan.
      // `gradoId`/`asignaturaId` viajan TAMBIÉN de una cuando la unidad ya
      // los trae (`UnidadTematica.gradoId`/`.asignaturaId`, no siempre
      // presentes — ver su comentario) — así el form no depende del cruce
      // por NOMBRE contra el catálogo del docente (`AsignaturaGradoSection`)
      // para saber a qué grado/asignatura pertenece: sin esto, "¿es
      // formativa?"/instrumento/niveles quedaban esperando ese cruce
      // asíncrono aunque la unidad ya lo determinara sin ambigüedad, y si el
      // nombre no calzaba exacto contra el catálogo (mayúsculas, espacios)
      // el cruce nunca resolvía. Si la unidad no trae los ids, se sigue
      // cayendo al cruce por nombre (sin cambios ahí, solo más robusto, ver
      // su comentario en `AsignaturaGradoSection`).
      base = {
        ...base,
        grado: unidadPreseleccionada.grado,
        asignatura: unidadPreseleccionada.asignatura,
        gradoId: unidadPreseleccionada.gradoId,
        asignaturaId: unidadPreseleccionada.asignaturaId,
        unidad: { id: unidadPreseleccionada.id, nombre: unidadPreseleccionada.nombre },
      }
    }
    if (fechaInicio) base = { ...base, fechaInicio }
    if (fechaCierre) base = { ...base, fechaCierre }
    return base
  })

  return (
    <EditarActividadForm
      actividad={actividad}
      formId={formId}
      esNueva
      onDirtyChange={onDirtyChange}
      onSubmit={onSubmit}
    />
  )
}
