import { useEffect, useState } from "react"
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
import { useOfflineWritable } from "@/lib/offline/outbox/hooks"

import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useActividadesTabsQuery, type ActividadTab } from "@/features/planeador/api/query/use-actividades-tabs-query"
import { EditarActividadForm } from "@/features/planeador/components/forms/form-editar-actividad"
import { crearActividadVacia } from "@/features/planeador/lib/empty-actividad"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"
import { buildCrearActividadSaga } from "@/features/planeador/offline/build-sagas"
import { runSaga } from "@/features/planeador/offline/run-saga"
import {
  fallosDeSaga,
  mensajeErrorSaga,
  recursosOmitidosDe,
  SAGA_PARTIAL_QUEUED_MESSAGE,
  SAGA_QUEUED_MESSAGE,
} from "@/features/planeador/offline/saga-messages"

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

  // Sin permiso de "crear" en Planeador, esta pantalla no debería ni poder
  // verse: se redirige de una al listado apenas se sabe que no hay permiso
  // (mientras `isLoadingPermiso` es `true` no se puede afirmar nada todavía,
  // ver `useMenuPermission`). Es la primera pantalla del feature con un
  // guard de PERMISO a nivel de página (el router solo gatea por sesión,
  // ver CLAUDE.md) — los puntos de entrada (botones "Nueva actividad") ya
  // estaban ocultos, esto cubre a quien llega por URL directa.
  const { puedeCrear, puedeEditar, isLoading: isLoadingPermiso } = usePlaneadorSoloLectura()
  useEffect(() => {
    if (!isLoadingPermiso && !puedeCrear) {
      navigate({ to: paths.app.planeadorActividades.getHref(), replace: true })
    }
  }, [isLoadingPermiso, puedeCrear, navigate])

  // `unidadId` llega cuando se abre esta pantalla desde "Agregar actividad"
  // dentro de una Unidad temática (`DialogAgregarActividad`); `fechaInicio`/
  // `fechaCierre` cuando se abre desde un clic en una celda del calendario
  // mensual (`PlaneadorMonthGrid` vía `planeador-page.tsx`) — ver
  // `planeadorActividadCrearSearchSchema`. `strict: false` porque esta
  // página también se monta sin ningún search (desde "Nueva actividad" del
  // listado general).
  const { unidadId, fechaInicio, fechaCierre, rotulo } = useSearch({ strict: false }) as {
    unidadId?: string
    fechaInicio?: string
    fechaCierre?: string
    rotulo?: string
  }
  // Pestaña de Rótulo de Ejecución desde la que se abrió "Nueva actividad"
  // (`planeador-tabs.tsx`/`planeador-page.tsx`) — acota Grado/Asignatura a
  // esa pestaña, mismo criterio que `tab` en `planeador-crear-unidad-page.tsx`.
  // Con un solo rótulo disponible, se usa igual aunque `?rotulo=` no haya
  // llegado (entrada directa por URL, sin pasar por el botón): no hay
  // ambigüedad que resolver, y saltear el acotamiento ahí dejaba el alta
  // viendo todo el catálogo del docente en vez de solo lo de esa pestaña.
  const { data: actividadTabs } = useActividadesTabsQuery()
  const tabDesdeAgregar: ActividadTab | undefined =
    actividadTabs?.find((t) => t.rotulo === rotulo) ??
    (actividadTabs?.length === 1 ? actividadTabs[0] : undefined)
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

  // Guardado como saga (Fase 3 offline, `features/planeador/offline`): los
  // mismos pasos y en el mismo orden de siempre —actividad → materiales →
  // instrumento → adaptaciones → criterios—, pero cada uno con su
  // `Idempotency-Key` fija. Con red se envían desde acá; sin red (o si la red
  // se cae a mitad) lo que falta queda en la outbox y se reanuda solo.
  //
  // Los fallos de los pasos posteriores NO se avisan con `notify()`:
  // `handleSubmit` navega apenas termina y el `NoticeProvider` de esta
  // pantalla se desmonta con el aviso adentro (bug de QA "no sale mensaje de
  // error"). Se juntan y viajan con `queueNotice()` a la pantalla de destino.
  const [guardando, setGuardando] = useState(false)
  const escritura = useOfflineWritable("Necesitas conexión para crear actividades en este equipo.")

  async function handleSubmit(values: Actividad) {
    if (guardando) return
    setGuardando(true)
    let run: Awaited<ReturnType<typeof runSaga>>
    try {
      run = await runSaga(await buildCrearActividadSaga(values), { continueOnError: true })
    } catch (error) {
      notify(mensajeErrorSaga(error), { variant: "error" })
      setGuardando(false)
      return
    }
    setGuardando(false)

    if (run.queued && run.queuedFrom === 0) {
      queueNotice(SAGA_QUEUED_MESSAGE)
      navigate({ to: paths.app.planeadorActividades.getHref() })
      return
    }
    const [creada] = run.outcomes
    if (!creada?.ok) {
      // El motivo real lo manda el backend (una validación del planeador es
      // accionable: qué instrumento no aplica, qué unidad lo impide).
      notify(getErrorMessage(creada?.error), { variant: "error" })
      return
    }
    const { id } = creada.result as { id: number }

    if (run.queued) {
      queueNotice(SAGA_PARTIAL_QUEUED_MESSAGE)
      navigate({ to: paths.app.planeadorActividades.getHref() })
      return
    }

    const fallos = fallosDeSaga(run.outcomes)
    const recursosOmitidos = recursosOmitidosDe(run.outcomes)
    if (recursosOmitidos.length > 0) {
      fallos.push(
        `estos materiales de tipo "Archivo", porque no tenían un archivo cargado: ${recursosOmitidos.join(", ")}`,
      )
    }

    // `queueNotice`, no `notify`: `navigate` desmonta esta pantalla y su
    // `NoticeProvider`; el aviso lo muestra el de la pantalla de destino.
    if (fallos.length > 0) {
      queueNotice(`La actividad se creó, pero no se pudo guardar ${fallos.join("; ni ")}. Revísala y vuelve a guardar.`, {
        variant: "error",
      })
      // Con algo pendiente se lleva al docente a EDITAR la actividad recién
      // creada (si tiene permiso), donde puede corregirlo y volver a guardar
      // — no al listado, donde tendría que buscarla primero. Volver a este
      // form de alta crearía una actividad duplicada.
      if (puedeEditar) {
        navigate({ to: paths.app.planeadorActividadEditar.getHref(String(id)) })
        return
      }
    } else {
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
              nativeButton={false}
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
        {esperandoPreseleccion || isLoadingPermiso || !puedeCrear ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando…
          </div>
        ) : (
          <CrearActividadForm
            unidadPreseleccionada={unidadPreseleccionada}
            fechaInicio={fechaInicio}
            fechaCierre={fechaCierre}
            tab={tabDesdeAgregar}
            formId={FORM_ID}
            onDirtyChange={setIsDirty}
            onSubmit={handleSubmit}
          />
        )}
      </TableScreenBody>

      <TableScreenFooter>
        {isDirty ? (
          <>
            <p className="text-sm">
              {escritura.queues
                ? "Sin conexión: al guardar, la actividad queda en este equipo y se crea al reconectar."
                : "Completa los datos y guarda para crear la actividad."}
            </p>
            <Button
              type="submit"
              form={FORM_ID}
              color="primary"
              variant="fill"
              size="sm"
              disabled={guardando || escritura.disabled}
              title={escritura.tooltip ?? undefined}
            >
              {guardando ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {guardando ? "Guardando..." : "Guardar"}
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
  tab,
  formId,
  onDirtyChange,
  onSubmit,
}: {
  unidadPreseleccionada: UnidadTematica | undefined
  /** `yyyy-MM-dd` — llega desde un clic en el calendario mensual (ver
   *  `onDayClick` en `planeador-page.tsx`). */
  fechaInicio?: string
  fechaCierre?: string
  /** Pestaña de Rótulo de Ejecución desde la que se abrió "Nueva actividad"
   *  (`?rotulo=`) — acota Grado/Asignatura en `AsignaturaGradoSection`. */
  tab?: ActividadTab
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
      tab={tab}
      onDirtyChange={onDirtyChange}
      onSubmit={onSubmit}
    />
  )
}
