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
import { EditarActividadForm } from "@/features/planeador/components/forms/form-editar-actividad"
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

/**
 * Resumen en texto plano de `afectadosAdaptacion`/`avisosPiar` (Reglas
 * 46/48) para agregarlo al aviso de éxito de `PUT .../estudiantes` — el
 * `NoticeProvider` muestra un solo mensaje por pantalla, así que no hay
 * dónde más mostrarlos sin perder la confirmación del guardado. Vacío si
 * ninguna lista trae datos (caso normal).
 */
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

/**
 * Edición de una actividad en una ruta aparte (no in-place en el panel).
 *
 * Mismo `<TableScreen>` que el resto de las pantallas de gestión, con un
 * `<TableScreenFooter>` sticky al pie: el aviso + el botón "Guardar" solo
 * aparecen cuando hay cambios sin guardar (mismo patrón que el editar de
 * Establecimiento Educativo).
 *
 * El form carga la actividad vía `useActividadDetalleQuery` y guarda con
 * `useUpdateActividad` (`PUT /planeador/actividades/:id`, parcial).
 */
export function PlaneadorEditarActividadPage() {
  const navigate = useNavigate()
  const { actividadId } = useParams({ strict: false }) as { actividadId?: string }

  // Regla 37: el bloqueo (`motivoNoEditable`) se decide con el detalle del
  // servidor, no con el de la caché, que pudo quedar de antes de la primera
  // calificación (hecha en el panel, en la planilla o en otro equipo). Con
  // red, el formulario no se monta hasta que llega el detalle fresco; sin red
  // (fetch en pausa) se usa el guardado.
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

  // Con "ver" pero sin "editar" en Planeador, o siendo Coordinador sin rol
  // docente (ver `usePlaneadorSoloLectura`), la actividad se muestra entera
  // en solo lectura y sin "Guardar". Sin ninguno de los dos, la pantalla no debería ni poder
  // verse: redirige al listado apenas se sabe que no hay permiso.
  const navigate = useNavigate()
  const { puedeEditar, puedeVer, soloLectura, isLoading: isLoadingPermiso } = usePlaneadorSoloLectura()
  const puedeAbrir = puedeEditar || puedeVer
  useEffect(() => {
    if (!isLoadingPermiso && !puedeAbrir) {
      navigate({ to: paths.app.planeadorActividades.getHref(), replace: true })
    }
  }, [isLoadingPermiso, puedeAbrir, navigate])

  // Para resolver si la unidad NUEVA (si el docente la cambió en el
  // select) calcula por "Ponderado" — ver el comentario de `handleSubmit`.

  // Precarga la rúbrica/lista de cotejo/escala/personalizado YA GUARDADA
  // (el detalle real no la trae, ver `use-instrumento-actividad-form-query.ts`)
  // ANTES de montar `EditarActividadForm`: el form solo lee `defaultValues`
  // una vez al montar (`useForm`), así que aplicarla después con
  // `setFieldValue` marcaría el form "sucio" apenas termina de cargar, sin
  // que el docente haya tocado nada.
  const esEvaluativa = actividad?.esEvaluativa ?? false
  const { data: instrumentoForm, isPending: isPendingInstrumento } = useInstrumentoActividadFormQuery(
    actividad?.id,
    esEvaluativa,
  )
  const isPendingCompleto = isPending || (esEvaluativa && isPendingInstrumento)
  // `{...actividad, ...instrumentoForm}` a secas pisaba `instrumentoPersonalizado`
  // ENTERO: `instrumentoForm` (GET .../instrumento) resuelve `metodoValoracion`/
  // `tipoEvidenciaEsperada`, pero no conoce `requiereArchivo`/`requiereRespuestaTexto`/
  // `descripcion` — esos viven en el detalle real de la actividad (`REQUIERE_ARCHIVO`/
  // `REQUIERE_TEXTO`/`DESCRIPCION_INSTRUMENTO`, campos de la actividad misma, no del
  // instrumento — ver `campos_disponibles...descripcionInstrumento.motivo`: "va en el
  // POST/PATCH de la actividad"), así que `toInstrumentoActividadParaForm` los rellena
  // con `false`/`""` a falta de otra cosa. El spread superficial dejaba esos tres
  // placeholders ganando sobre el valor real ya guardado: el docente marcaba "El
  // estudiante debe adjuntar un archivo", guardaba bien (confirmado: el backend sí lo
  // persiste), pero al reabrir la actividad el checkbox volvía a aparecer destildado.
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

  // Guardado como saga (Fase 3 offline, `features/planeador/offline`): el
  // orden real de siempre —unidad (vincular/desvincular) → PUT de la
  // actividad (con evidencias y criterios) → materiales → instrumento →
  // estudiantes → adaptaciones—, cada paso solo si cambió y con su
  // `Idempotency-Key` fija. Con red se envían desde acá y se detiene en el
  // primer error (nada de "actividad actualizada" con un paso mudo, ver la
  // historia en git de este archivo); sin red, o si la red se cae a mitad, lo
  // que falta queda en la outbox. La edición encolada verifica al sincronizar
  // la regla 37 y que nadie haya cambiado la actividad mientras tanto.
  const { data: unidadesResult } = useUnidadesQuery()
  const unidades = unidadesResult?.rows ?? []
  const [guardando, setGuardando] = useState(false)
  const escritura = useOfflineWritable("Necesitas conexión para editar actividades en este equipo.")

  // Regla 37: con calificaciones, observaciones o "No presentó" (o siendo
  // base de una recuperación) la actividad se ve entera pero no se guarda: el
  // backend respondería 409 igual. Las calificaciones hechas sin red que
  // esperan en la outbox también cuentan: el servidor todavía no las ve.
  const ops = useOutboxOps()
  const bloqueoEdicion =
    motivoNoEditable(actividad) ??
    (actividad && resultadosSinSincronizar(ops, actividad.id) > 0 ? MENSAJE_RESULTADOS_SIN_SINCRONIZAR : undefined)

  async function handleSubmit(values: Actividad) {
    // El form ya está en solo lectura; esto es la red de seguridad por si
    // llega a dispararse el submit.
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
      notify(mensajeErrorSaga(error), { variant: "error" })
      setGuardando(false)
      return
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
      notify(
        datosGuardados
          ? `Se guardaron los datos de la actividad, pero no se pudo guardar ${fallosDeSaga([fallido])[0]}`
          : getErrorMessage(fallido.error),
        { variant: "error" },
      )
      return
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

  // Misma condición que tenía la card de validación (se mostraba con el form
  // ya cargado); ahora vive en el footer sticky junto al "Guardar".
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

      {/* El footer es el que avisa y guarda; aparece solo cuando hay cambios.
          Sigue el patrón de `add-establishment-page`: siempre está montado
          (preserva el layout del `TableScreen`), pero su contenido solo
          pinta el aviso + el Guardar cuando `isDirty`. */}
      {/* Una sola barra: a la izquierda el estado de la validación del
          coordinador y el aviso de cambios; a la derecha "Aprobar" (si
          `puedeValidar`) y "Guardar" (si hay cambios). */}
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
