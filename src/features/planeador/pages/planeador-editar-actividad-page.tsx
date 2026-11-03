import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
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
import { getErrorMessage, isNotFoundError } from "@/lib/api-client"
import { useOfflineWritable, useOutboxOps } from "@/lib/offline/outbox/hooks"

import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { useInstrumentoActividadFormQuery } from "@/features/planeador/api/query/use-instrumento-actividad-form-query"
import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import type { SetEstudiantesResult } from "@/features/planeador/api/mutations/set-estudiantes-actividad"
import { EditarActividadForm, type ResultadoGuardadoActividad } from "@/features/planeador/components/forms/form-editar-actividad"
import {
  esErrorEvidenciasFaltantes,
  esErrorInstrumento,
  irAlCampoInvalido,
} from "@/features/planeador/components/forms/form-editar-actividad/helpers"
import {
  ValidacionCoordinadorAprobar,
  ValidacionCoordinadorEstado,
} from "@/features/planeador/components/validacion-coordinador"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import {
  MENSAJE_RESULTADOS_SIN_SINCRONIZAR,
  motivoNoEditable,
  resultadosSinSincronizar,
} from "@/features/planeador/lib/actividad-editable"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"
import { buildEditarActividadSaga } from "@/features/planeador/offline/build-sagas"
import { runSaga } from "@/features/planeador/offline/run-saga"
import { SAGA_KINDS } from "@/features/planeador/offline/saga-handlers"
import {
  fallosDeSaga,
  mensajeErrorSaga,
  recursosOmitidosDe,
  SAGA_PARTIAL_QUEUED_MESSAGE,
  SAGA_QUEUED_MESSAGE,
} from "@/features/planeador/offline/saga-messages"

const FORM_ID = "editar-actividad-form"

const MENSAJE_SIN_PERMISO_EDITAR =
  "Tu usuario puede consultar esta actividad, pero no tiene permiso para modificarla."

/** Resumen de afectadosAdaptacion/avisosPiar (Reglas 46/48) para el aviso de éxito: NoticeProvider muestra uno solo. */
function construirAvisoEstudiantes(resultado: SetEstudiantesResult): string {
  const partes: string[] = []
  if (resultado.afectadosAdaptacion.length > 0) {
    const nombres = resultado.afectadosAdaptacion.map((a) => a.estudiante).join(", ")
    partes.push(`Al salir de la actividad, ${nombres} también salió(salieron) de una o más adaptaciones curriculares.`)
  }
  if (resultado.avisosPiar.length > 0) {
    const nombres = resultado.avisosPiar.map((a) => a.estudiante).join(", ")
    partes.push(`${nombres} tiene(n) discapacidad registrada y no quedó(quedaron) en esta actividad.`)
  }
  return partes.length > 0 ? ` ${partes.join(" ")}` : ""
}

/** Edición de actividad en ruta aparte (no in-place en el panel). */
export function PlaneadorEditarActividadPage() {
  const navigate = useNavigate()
  const { actividadId } = useParams({ strict: false }) as { actividadId?: string }

  // Regla 37: el bloqueo se decide con el detalle fresco del servidor; sin red se usa el de caché.
  const {
    data: actividad,
    isPending,
    isError,
    error,
    isFetchedAfterMount,
    fetchStatus,
  } = useActividadDetalleQuery(actividadId ? Number(actividadId) : undefined, { siempreAlMontar: true })
  const verificandoBloqueo = !!actividad && !isFetchedAfterMount && fetchStatus === "fetching"

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
    <NoticeProvider>
      <EditarActividadPageContent
        isPending={isPending || verificandoBloqueo}
        isError={isError}
        error={error}
        actividad={actividad}
        onClose={() => navigate({ to: paths.app.planeadorActividades.getHref() })}
      />
    </NoticeProvider>
  )
}

function EditarActividadPageContent({
  isPending,
  isError,
  error,
  actividad,
  onClose,
}: {
  isPending: boolean
  isError: boolean
  error: unknown
  actividad: ReturnType<typeof useActividadDetalleQuery>["data"]
  onClose: () => void
}) {
  const [isDirty, setIsDirty] = useState(false)
  const { notify } = useNotify()

  // Ver sin editar (o Coordinador sin rol docente) = solo lectura; sin ninguno redirige al listado.
  const navigate = useNavigate()
  const { puedeEditar, puedeVer, soloLectura, isLoading: isLoadingPermiso } = usePlaneadorSoloLectura()
  const puedeAbrir = puedeEditar || puedeVer
  useEffect(() => {
    if (!isLoadingPermiso && !puedeAbrir) {
      navigate({ to: paths.app.planeadorActividades.getHref(), replace: true })
    }
  }, [isLoadingPermiso, puedeAbrir, navigate])

  // Precargar el instrumento guardado antes de montar: useForm lee defaultValues una vez y setFieldValue lo ensuciaría.
  const esEvaluativa = actividad?.esEvaluativa ?? false
  const { data: instrumentoForm, isPending: isPendingInstrumento } = useInstrumentoActividadFormQuery(
    actividad?.id,
    esEvaluativa,
  )
  const isPendingCompleto = isPending || (esEvaluativa && isPendingInstrumento)
  // Spread superficial pisaba requiereArchivo/requiereRespuestaTexto/descripcion reales con placeholders del instrumento.
  const actividadParaForm =
    actividad && (!esEvaluativa || instrumentoForm)
      ? {
          ...actividad,
          ...(instrumentoForm ?? {}),
          instrumentoPersonalizado: {
            ...(instrumentoForm?.instrumentoPersonalizado ?? actividad.instrumentoPersonalizado),
            requiereArchivo: actividad.instrumentoPersonalizado.requiereArchivo,
            requiereRespuestaTexto: actividad.instrumentoPersonalizado.requiereRespuestaTexto,
            descripcion: actividad.instrumentoPersonalizado.descripcion,
          },
        }
      : undefined

  // Saga (Fase 3 offline): unidad → PUT → materiales → instrumento → estudiantes → adaptaciones; para en el primer error,
  // sin red queda en outbox y al sincronizar verifica Regla 37 y cambios ajenos.
  const { data: unidadesResult } = useUnidadesQuery()
  const unidades = unidadesResult?.rows ?? []
  const [guardando, setGuardando] = useState(false)
  const escritura = useOfflineWritable("Necesitas conexión para editar actividades en este equipo.")

  // Regla 37: con calificaciones/observaciones/No presentó/recuperación (incluso en outbox) no se guarda; backend daría 409.
  const ops = useOutboxOps()
  const bloqueoEdicion =
    motivoNoEditable(actividad) ??
    (actividad && resultadosSinSincronizar(ops, actividad.id) > 0 ? MENSAJE_RESULTADOS_SIN_SINCRONIZAR : undefined)

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
    // Red de seguridad: el form ya está en solo lectura.
    if (bloqueoEdicion) return
    if (!actividad || guardando) return
    setGuardando(true)
    let run: Awaited<ReturnType<typeof runSaga>>
    try {
      const saga = await buildEditarActividadSaga(values, {
        actividad,
        unidades,
        instrumentosPermitidos: actividad.camposDisponibles?.evaluacion.instrumentosPermitidos,
      })
      run = await runSaga(saga, { continueOnError: false })
    } catch (error) {
      setGuardando(false)
      return avisarErrorGuardado(mensajeErrorSaga(error))
    }
    setGuardando(false)

    if (run.queued) {
      queueNotice(run.queuedFrom === 0 ? SAGA_QUEUED_MESSAGE : SAGA_PARTIAL_QUEUED_MESSAGE)
      setIsDirty(false)
      onClose()
      return
    }

    const fallido = run.outcomes.find((o) => !o.ok)
    if (fallido) {
      const datosGuardados = run.outcomes.some((o) => o.ok && o.kind === SAGA_KINDS.actividadEditar)
      const resultado = avisarErrorGuardado(
        datosGuardados
          ? `Se guardaron los datos de la actividad, pero no se pudo guardar ${fallosDeSaga([fallido])[0]}`
          : getErrorMessage(fallido.error),
        fallido.kind === SAGA_KINDS.actividadInstrumento,
      )
      return resultado
    }

    const recursosOmitidos = recursosOmitidosDe(run.outcomes)
    const estudiantes = run.outcomes.find((o) => o.kind === SAGA_KINDS.actividadEstudiantes)
    const avisoEstudiantes = estudiantes ? construirAvisoEstudiantes(estudiantes.result as SetEstudiantesResult) : ""
    const avisoRecursos =
      recursosOmitidos.length > 0
        ? ` No se guardaron estos materiales de tipo "Archivo" (sin un archivo cargado): ${recursosOmitidos.join(", ")}.`
        : ""
    queueNotice(`Actividad actualizada correctamente.${avisoEstudiantes}${avisoRecursos}`)
    setIsDirty(false)
    onClose()
  }

  const mostrarValidacion =
    !isPendingCompleto && !isLoadingPermiso && puedeAbrir && !!actividadParaForm && !!actividad?.requiereValidacion
  const formSoloLectura = soloLectura || !!bloqueoEdicion
  const mostrarGuardar = isDirty && !formSoloLectura

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
        {(isPendingCompleto || isLoadingPermiso || !puedeAbrir) && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando…
          </div>
        )}

        {isError && (
          <p className="text-red px-6 py-12 text-center text-sm">
            {getErrorMessage(error)}
          </p>
        )}

        {!isPendingCompleto && !isLoadingPermiso && puedeAbrir && actividadParaForm && (
          <div className="flex flex-col gap-6">
            {soloLectura ? (
              <p className="text-muted-foreground text-sm">{MENSAJE_SIN_PERMISO_EDITAR}</p>
            ) : (
              bloqueoEdicion && (
                <p role="status" className="rounded-sm border border-yellow-stroke bg-yellow-22 px-3 py-2 text-sm">
                  {bloqueoEdicion} Puedes consultarla, pero no modificarla.
                </p>
              )
            )}
            <EditarActividadForm
              key={actividadParaForm.id}
              actividad={actividadParaForm}
              formId={FORM_ID}
              readOnly={formSoloLectura}
              motivoSoloLectura={soloLectura ? MENSAJE_SIN_PERMISO_EDITAR : bloqueoEdicion}
              onDirtyChange={setIsDirty}
              onSubmit={handleSubmit}
            />
          </div>
        )}
      </TableScreenBody>

      {/* Footer siempre montado (layout); aviso/Guardar solo si isDirty, Aprobar si puedeValidar. */}
      <TableScreenFooter>
        <div className="flex min-w-0 flex-col gap-2">
          {mostrarValidacion && (
            <ValidacionCoordinadorEstado actividadId={actividadParaForm.id} requiereValidacion />
          )}
          {mostrarGuardar && (
            <p className="text-sm">Se detectaron cambios. Guardar para conservar la información.</p>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {mostrarValidacion && (
            <ValidacionCoordinadorAprobar actividadId={actividadParaForm.id} requiereValidacion />
          )}
          {mostrarGuardar && (
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
          )}
        </div>
      </TableScreenFooter>
    </TableScreen>
  )
}
