import { useEffect, useState } from "react"
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { LoadingLabel } from "@/components/offline/loading-label"
import { paths } from "@/config/paths"
import { getErrorMessage, isNotFoundError } from "@/lib/api-client"

import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import { useUnidadActividadesQuery } from "@/features/planeador/api/query/use-unidad-actividades-query"
import { useEditarUnidadSaga } from "@/features/planeador/offline/use-unidad-saga"
import { SAGA_QUEUED_MESSAGE } from "@/features/planeador/offline/saga-messages"
import { useOfflineWritable } from "@/lib/offline/outbox/hooks"
import type { UnidadActividad } from "@/features/planeador/api/types/unidad-tematica"
import {
  UnidadInfoGeneralFields,
  draftFromUnidad,
  draftToPayload,
  type UnidadDraft,
} from "@/features/planeador/components/forms/form-unidad-info-general"
import { UnidadFormTabs } from "@/features/planeador/components/forms/unidad-form-tabs"
import {
  articuloDefinido,
  mensajeUnidadGuardada,
  useRotuloUnidad,
} from "@/features/planeador/lib/unidad-instrumento-label"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnMinuscula,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import {
  articuloIndefinidoRotulo,
  pluralizarRotulo,
  terminacionRotulo,
} from "@/features/planeador/lib/rotulo-gramatica"
import { planeadorUnidadEditarRoute } from "@/router"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"
import { esAjena } from "@/features/planeador/lib/docente-dueno"
import {
  UNIDAD_ERRORES_MENSAJE,
  enfocarPrimerError,
  validarUnidadDraft,
} from "@/features/planeador/lib/unidad-validaciones"

/** Actividades sin peso para el método destino (Ponderado→ponderacion, Suma→notaMaxima; 0/null = sin capturar). */
function actividadesSinPeso(
  actividades: UnidadActividad[],
  metodoDestino: UnidadDraft["metodoCalculo"],
): UnidadActividad[] {
  if (metodoDestino === "Ponderado") return actividades.filter((a) => !a.ponderacion)
  if (metodoDestino === "Suma de puntos") return actividades.filter((a) => !a.notaMaxima)
  return []
}

const FORM_ID = "editar-unidad-form"

/** Edición en ruta aparte (no modal); criterios y actividades se editan en el panel de detalle. */
export function PlaneadorEditarUnidadPage() {
  const navigate = useNavigate()
  const { unidadId } = useParams({ strict: false }) as { unidadId?: string }

  const {
    data: unidad,
    isPending,
    isError,
    error,
  } = useUnidadDetalleQuery(unidadId ? Number(unidadId) : undefined)

  if (isNotFoundError(error)) {
    return <NotFoundPage />
  }

  return (
    <NoticeProvider>
      <EditarUnidadPageContent
        isPending={isPending}
        isError={isError}
        error={error}
        unidad={unidad}
        // `?instrumento=`: vuelve a la pestaña de esta unidad (y su miga).
        onClose={(instrumento) => navigate({ to: paths.app.planeadorUnidades.getHref(), search: { instrumento } })}
      />
    </NoticeProvider>
  )
}

function EditarUnidadPageContent({
  isPending,
  isError,
  error,
  unidad,
  onClose,
}: {
  isPending: boolean
  isError: boolean
  error: unknown
  unidad: ReturnType<typeof useUnidadDetalleQuery>["data"]
  onClose: (instrumento: string) => void
}) {
  const [draft, setDraft] = useState<UnidadDraft | null>(null)
  // Validación en front (los mensajes del back quedan de respaldo).
  const [intentosEnvio, setIntentosEnvio] = useState(0)
  // Foto inicial del borrador para "dirty": draftFromUnidad deja enunciadosDba vacío y daría falso dirty.
  const [initialDraft, setInitialDraft] = useState<UnidadDraft | null>(null)
  const { notify } = useNotify()
  // ?instrumento= = pestaña de origen; sin él se resuelve por el referente de la unidad.
  const search = useSearch({ from: planeadorUnidadEditarRoute.id })
  const instrumento = useRotuloUnidad(unidad, search.instrumento)
  const instrumentoLower = rotuloEnMinuscula(instrumento)
  // Rótulo de la actividad (Regla 13) para el aviso de cambio de método.
  const rotuloActividad = unidad?.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK
  const rotuloActividadLower = rotuloEnMinuscula(rotuloActividad)
  const rotuloActividadGenero = terminacionRotulo(rotuloActividad)

  // Sin "editar" en Planeador redirige al listado.
  const navigate = useNavigate()
  const { puedeEditar, isLoading: isLoadingPermiso } = usePlaneadorSoloLectura()
  useEffect(() => {
    // Una unidad compartida de un colega no se edita (Regla 25).
    if ((!isLoadingPermiso && !puedeEditar) || esAjena(unidad)) {
      navigate({ to: paths.app.planeadorUnidades.getHref(), replace: true })
    }
  }, [isLoadingPermiso, puedeEditar, unidad, navigate])

  // unidad.enunciadosDba llega vacío (endpoint aparte); se precargan desde acá.
  const { data: referente, isPending: referentePending } = useUnidadReferenteQuery(unidad?.id)

  // Avisar antes de guardar si al pasar de Promedio simple a Ponderado/Suma hay actividades sin peso.
  const { data: actividadesVinculadas = [], isPending: actividadesPending } = useUnidadActividadesQuery(unidad?.id)
  const [confirmacionCambioMetodo, setConfirmacionCambioMetodo] = useState<{
    unidadId: number
    data: ReturnType<typeof draftToPayload>
    sinPeso: UnidadActividad[]
  } | null>(null)

  // Saga de un paso (Fase 3 offline): al sincronizar verifica que la unidad no cambió (D-F3-4).
  const escritura = useOfflineWritable("Necesitas conexión para editar unidades en este equipo.")
  const updateMutation = useEditarUnidadSaga(unidad, {
    onQueued: () => {
      queueNotice(SAGA_QUEUED_MESSAGE)
      onClose(instrumento)
    },
    onSuccess: (result) => {
      if (result.status === "error") {
        notify(result.message ?? `No se pudo actualizar ${articuloDefinido(instrumento)} ${instrumentoLower}.`, {
          variant: "error",
        })
        return
      }
      // notify() se perdería al desmontar; Regla 28: se anexan las actividades convertidas al mismo aviso.
      const avisoConversion =
        result.actividadesAfectadas.length > 0
          ? ` Se convirtió el peso/puntaje de: ${result.actividadesAfectadas.map((a) => a.titulo).join(", ")}.`
          : ""
      queueNotice(`${mensajeUnidadGuardada("actualizado", instrumento)}${avisoConversion}`)
      onClose(instrumento)
    },
    // Usar el error real de la mutación, no un texto quemado.
    onError: (mensaje: string) => {
      notify(mensaje, { variant: "error" })
    },
  })

  // draft/initialDraft se llenan juntos con unidad y referente para no arrancar dirty.
  const current = draft

  useEffect(() => {
    if (initialDraft || !unidad || referentePending) return
    const base =
      referente && referente.enunciados.length > 0
        ? { ...draftFromUnidad(unidad), enunciadosDba: referente.enunciados.map((e) => ({ id: e.id, text: e.text })) }
        : draftFromUnidad(unidad)
    setInitialDraft(base)
    setDraft(base)
  }, [initialDraft, unidad, referente, referentePending])

  const isDirty = current != null && initialDraft != null && JSON.stringify(current) !== JSON.stringify(initialDraft)

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description={unidad ? `Editando "${unidad.nombre}"` : undefined}
          action={
            <Button
              color="neutral"
              size="sm"
              variant="fill"
              nativeButton={false}
              render={<Link to={paths.app.planeadorUnidades.getHref()} search={{ instrumento }} />}
            >
              Cerrar
            </Button>
          }
        >
          {`Editar ${instrumento.toLowerCase()}`}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody className="rounded-b-none border-b-0">
        {(isPending || isLoadingPermiso || !puedeEditar || (!isError && unidad && !current)) && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <LoadingLabel>Cargando…</LoadingLabel>
          </div>
        )}

        {isError && (
          <p className="text-red px-6 py-12 text-center text-sm">
            {getErrorMessage(error)}
          </p>
        )}

        {puedeEditar && unidad && current && (
          <form
            id={FORM_ID}
            onSubmit={(e) => {
              e.preventDefault()
              setIntentosEnvio((n) => n + 1)
              const errores = validarUnidadDraft(current)
              if (Object.keys(errores).length > 0) {
                notify(UNIDAD_ERRORES_MENSAJE, { variant: "error" })
                enfocarPrimerError(errores)
                return
              }
              const data = draftToPayload(current)
              // Método anterior = el guardado en unidad; nuevo = el del form.
              const metodoAnterior = unidad.metodoCalculo
              const metodoNuevo = current.metodoCalculo
              const cambiaDesdePromedioSimple =
                metodoAnterior === "Promedio simple" && metodoNuevo !== "Promedio simple"

              if (cambiaDesdePromedioSimple) {
                const sinPeso = actividadesSinPeso(actividadesVinculadas, metodoNuevo)
                if (sinPeso.length > 0) {
                  setConfirmacionCambioMetodo({ unidadId: unidad.id, data, sinPeso })
                  return
                }
              }
              // ENUNCIADOS en el PUT (sso V492) reemplaza la lista completa; no hace falta desvincular aparte.
              updateMutation.mutate({ unidadId: unidad.id, data })
            }}
          >
            <UnidadFormTabs
              unidad={unidad}
              rotuloUnidad={instrumento}
              esFormativo={current.enfoquePedagogico === "Formativo"}
              infoGeneralContent={
                <UnidadInfoGeneralFields
                  draft={current}
                  onChange={(patch) => setDraft({ ...current, ...patch })}
                  unidadId={unidad.id}
                  rotuloUnidad={instrumento}
                  errores={validarUnidadDraft(current)}
                  intentosEnvio={intentosEnvio}
                />
              }
            />
          </form>
        )}
      </TableScreenBody>

      <TableScreenFooter>
        {isDirty ? (
          <>
            <p className="text-sm">Guarda para conservar los cambios.</p>
            <Button
              type="submit"
              form={FORM_ID}
              color="primary"
              variant="fill"
              size="sm"
              disabled={updateMutation.isPending || actividadesPending || escritura.disabled}
              title={escritura.tooltip ?? undefined}
            >
              {updateMutation.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {updateMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </>
        ) : (
          <span />
        )}
      </TableScreenFooter>

      {/* Diálogo controlado: se abre desde el submit, sin AlertDialogTrigger. */}
      <AlertDialog
        open={confirmacionCambioMetodo != null}
        onOpenChange={(open) => {
          if (!open) setConfirmacionCambioMetodo(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pluralizarRotulo(rotuloActividad)} sin peso capturado</AlertDialogTitle>
            <AlertDialogDescription>
              Al cambiar de &ldquo;Promedio simple&rdquo; a &ldquo;{confirmacionCambioMetodo?.data.metodoCalculo}
              &rdquo;,{" "}
              {confirmacionCambioMetodo && confirmacionCambioMetodo.sinPeso.length === 1
                ? `${articuloDefinido(rotuloActividad)} siguiente ${rotuloActividadLower} vinculad${rotuloActividadGenero} no tiene`
                : `${rotuloActividadGenero === "o" ? "los" : "las"} siguientes ${pluralizarRotulo(rotuloActividadLower)} vinculad${rotuloActividadGenero}s no tienen`}{" "}
              {confirmacionCambioMetodo?.data.metodoCalculo === "Suma de puntos" ? "puntaje" : "ponderación"} capturado
              y quedarán en 0 hasta que se edite cada {articuloIndefinidoRotulo(rotuloActividad) === "un" ? "uno" : "una"}:{" "}
              <strong>{confirmacionCambioMetodo?.sinPeso.map((a) => a.nombre).join(", ")}</strong>. ¿Guardar de todas
              formas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              color="primary"
              disabled={updateMutation.isPending}
              aria-busy={updateMutation.isPending}
              onClick={() => {
                if (!confirmacionCambioMetodo) return
                updateMutation.mutate({
                  unidadId: confirmacionCambioMetodo.unidadId,
                  data: confirmacionCambioMetodo.data,
                })
                setConfirmacionCambioMetodo(null)
              }}
            >
              {updateMutation.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar de todas formas
            </AlertDialogAction>
            <AlertDialogCancel variant="fill" color="neutral" disabled={updateMutation.isPending}>
              Volver a revisar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableScreen>
  )
}
