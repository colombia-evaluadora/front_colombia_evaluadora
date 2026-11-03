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
import { EditarActividadForm, type ResultadoGuardadoActividad } from "@/features/planeador/components/forms/form-editar-actividad"
import {
  esErrorEvidenciasFaltantes,
  esErrorInstrumento,
  irAlCampoInvalido,
} from "@/features/planeador/components/forms/form-editar-actividad/helpers"
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

/** Alta de actividad: reusa `EditarActividadForm` con `onSubmit` propio; "Guardar" solo con cambios (`isDirty`). */
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

  // El router solo gatea por sesión: sin "crear" (ya cargado) se redirige, cubre la entrada por URL directa.
  const { puedeCrear, puedeEditar, isLoading: isLoadingPermiso } = usePlaneadorSoloLectura()
  useEffect(() => {
    if (!isLoadingPermiso && !puedeCrear) {
      navigate({ to: paths.app.planeadorActividades.getHref(), replace: true })
    }
  }, [isLoadingPermiso, puedeCrear, navigate])

  // `unidadId` viene de "Agregar actividad" en una unidad; fechas, del calendario. `strict: false`: puede no haber search.
  const { unidadId, fechaInicio, fechaCierre, rotulo } = useSearch({ strict: false }) as {
    unidadId?: string
    fechaInicio?: string
    fechaCierre?: string
    rotulo?: string
  }
  // Pestaña de rótulo que acota Grado/Asignatura; con un solo rótulo se usa aunque falte `?rotulo=`.
  const { data: actividadTabs } = useActividadesTabsQuery()
  const tabDesdeAgregar: ActividadTab | undefined =
    actividadTabs?.find((t) => t.rotulo === rotulo) ??
    (actividadTabs?.length === 1 ? actividadTabs[0] : undefined)
  // Resuelve los NOMBRES de grado/asignatura de la unidad preseleccionada (los ids casi nunca vienen del backend).
  const { data: unidadesResult, isPending: isPendingUnidades } = useUnidadesQuery()
  const unidadPreseleccionada: UnidadTematica | undefined = unidadId
    ? unidadesResult?.rows.find((u) => String(u.id) === unidadId)
    : undefined
  // Con `unidadId` se espera el listado: `defaultValues` se lee una sola vez al montar.
  const esperandoPreseleccion = Boolean(unidadId) && isPendingUnidades

  // Saga offline con `Idempotency-Key` por paso; sin red lo pendiente queda en la outbox.
  // Fallos posteriores van por `queueNotice()`: `notify()` se pierde al navegar (bug de QA).
  const [guardando, setGuardando] = useState(false)
  const escritura = useOfflineWritable("Necesitas conexión para crear actividades en este equipo.")

  // Errores del backend de la sección del instrumento ("Marque al menos una evidencia…", instrumento
  // rechazado): el form resalta el campo y el aviso ofrece "Ir al campo", como los de validación local.
  function avisarErrorGuardado(mensaje: string, pasoInstrumento = false): ResultadoGuardadoActividad | undefined {
    const evidenciasFaltantes = esErrorEvidenciasFaltantes(mensaje)
    const instrumentoInvalido = !evidenciasFaltantes && esErrorInstrumento(mensaje, pasoInstrumento)
    const irAlCampo = evidenciasFaltantes || instrumentoInvalido
    notify(
      mensaje,
      irAlCampo
        ? { variant: "error", action: { label: "Ir al campo", onClick: () => irAlCampoInvalido(FORM_ID) } }
        : { variant: "error" },
    )
    return irAlCampo ? { evidenciasFaltantes, instrumentoInvalido } : undefined
  }

  async function handleSubmit(values: Actividad) {
    if (guardando) return
    setGuardando(true)
    let run: Awaited<ReturnType<typeof runSaga>>
    try {
      run = await runSaga(await buildCrearActividadSaga(values), { continueOnError: true })
    } catch (error) {
      setGuardando(false)
      return avisarErrorGuardado(mensajeErrorSaga(error))
    }
    setGuardando(false)

    if (run.queued && run.queuedFrom === 0) {
      queueNotice(SAGA_QUEUED_MESSAGE)
      navigate({ to: paths.app.planeadorActividades.getHref() })
      return
    }
    const [creada] = run.outcomes
    if (!creada?.ok) {
      // El motivo del backend es accionable (qué instrumento o unidad lo impide).
      return avisarErrorGuardado(getErrorMessage(creada?.error))
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

    // `queueNotice`: `navigate` desmonta este `NoticeProvider`.
    if (fallos.length > 0) {
      queueNotice(`La actividad se creó, pero no se pudo guardar ${fallos.join("; ni ")}. Revísala y vuelve a guardar.`, {
        variant: "error",
      })
      // A editar la recién creada: volver al alta la duplicaría.
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

/** Separado para que el `useState` lazy lea `unidadPreseleccionada` ya resuelta (se monta tras `esperandoPreseleccion`). */
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
  /** `yyyy-MM-dd`, desde el calendario mensual. */
  fechaInicio?: string
  fechaCierre?: string
  /** Pestaña de `?rotulo=`: acota Grado/Asignatura. */
  tab?: ActividadTab
  formId: string
  onDirtyChange: (dirty: boolean) => void
  onSubmit: (values: Actividad) => void | Promise<void | ResultadoGuardadoActividad>
}) {
  const [actividad] = useState(() => {
    let base = crearActividadVacia()
    if (unidadPreseleccionada) {
      // Con ids de la unidad se evita el cruce por nombre (asíncrono y frágil); sin ids, se cae a ese cruce.
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
