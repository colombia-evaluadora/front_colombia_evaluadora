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
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { getErrorMessage, isNotFoundError } from "@/lib/api-client"

import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import { useUnidadActividadesQuery } from "@/features/planeador/api/query/use-unidad-actividades-query"
import { useUpdateUnidad } from "@/features/planeador/api/mutations/update-unidad"
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

/** Actividades vinculadas sin peso capturado para el método de cálculo
 *  destino — "Ponderado" mira `ponderacion`, "Suma de puntos" mira
 *  `notaMaxima` (0/`null` cuentan como "sin capturar"). "Promedio simple"
 *  no usa ninguna columna de peso, así que no aplica (siempre `[]`). */
function actividadesSinPeso(
  actividades: UnidadActividad[],
  metodoDestino: UnidadDraft["metodoCalculo"],
): UnidadActividad[] {
  if (metodoDestino === "Ponderado") return actividades.filter((a) => !a.ponderacion)
  if (metodoDestino === "Suma de puntos") return actividades.filter((a) => !a.notaMaxima)
  return []
}

const FORM_ID = "editar-unidad-form"

/**
 * Edición de "Información general" de una unidad temática en una ruta
 * aparte (no un modal — ver el mismo criterio en
 * `planeador-editar-actividad-page.tsx`). Criterios y actividades
 * vinculadas se siguen editando desde el panel de detalle, no acá.
 */
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
  // Foto del borrador ANTES de que el docente toque nada — la misma que se
  // arma en el efecto de abajo, junto con `draft` — para saber si "hay
  // cambios" (footer sticky, ver `TableScreenFooter` más abajo). Comparar
  // contra `draftFromUnidad(unidad)` a secas daría un falso "dirty" apenas
  // carga: ese helper siempre deja `enunciadosDba` vacío (ver su
  // comentario), así que la precarga de abajo ya lo "ensucia" sin que el
  // docente haya hecho nada.
  const [initialDraft, setInitialDraft] = useState<UnidadDraft | null>(null)
  const { notify } = useNotify()
  // `?instrumento=` es el rótulo de la pestaña desde la que se entró (ver
  // `planeador-unidades-page.tsx`); sin él (URL directa) se resuelve por el
  // referente real de la unidad.
  const search = useSearch({ from: planeadorUnidadEditarRoute.id })
  const instrumento = useRotuloUnidad(unidad, search.instrumento)
  const instrumentoLower = rotuloEnMinuscula(instrumento)
  // Rótulo de la actividad (Regla 13) para el aviso de cambio de método.
  const rotuloActividad = unidad?.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK
  const rotuloActividadLower = rotuloEnMinuscula(rotuloActividad)
  const rotuloActividadGenero = terminacionRotulo(rotuloActividad)

  // Mismo guard de permiso que `planeador-editar-actividad-page.tsx`: sin
  // "editar" en Planeador, redirige al listado apenas se sabe que no hay
  // permiso.
  const navigate = useNavigate()
  const { puedeEditar, isLoading: isLoadingPermiso } = usePlaneadorSoloLectura()
  useEffect(() => {
    if (!isLoadingPermiso && !puedeEditar) {
      navigate({ to: paths.app.planeadorUnidades.getHref(), replace: true })
    }
  }, [isLoadingPermiso, puedeEditar, navigate])

  // `unidad.enunciadosDba` (del detalle) siempre llega vacío contra el
  // backend real (viven en un endpoint aparte — ver el comentario de
  // `UnidadTematica.enunciadosDba`); los que la unidad YA tiene relacionados
  // salen de acá, para precargar el picker de "Derechos Básicos de
  // Aprendizaje" con el borrador inicial.
  const { data: referente, isPending: referentePending } = useUnidadReferenteQuery(unidad?.id)

  // Regla pedida: si el docente cambia el método de cálculo de "Promedio
  // simple" (donde ninguna actividad tiene peso propio) a "Ponderado" o
  // "Suma de puntos" (donde SÍ lo tiene), y ya hay actividades vinculadas
  // sin ese peso capturado, se avisa ANTES de guardar — si no, el docente
  // se entera recién al reabrir cada actividad una por una y encontrarlas
  // en 0/sin puntaje. Reusa `useUnidadActividadesQuery`: el panel de
  // detalle ya consulta este mismo endpoint, no hace falta una query nueva.
  const { data: actividadesVinculadas = [], isPending: actividadesPending } = useUnidadActividadesQuery(unidad?.id)
  const [confirmacionCambioMetodo, setConfirmacionCambioMetodo] = useState<{
    unidadId: number
    data: ReturnType<typeof draftToPayload>
    sinPeso: UnidadActividad[]
  } | null>(null)

  const updateMutation = useUpdateUnidad({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message ?? `No se pudo actualizar ${articuloDefinido(instrumento)} ${instrumentoLower}.`, {
            variant: "error",
          })
          return
        }
        // `onClose` navega de vuelta al listado de unidades — un `notify()`
        // acá se perdería con el `NoticeProvider` de esta pantalla al
        // desmontarse.
        // Regla 28: si el criterio de cálculo cambió con actividades ya
        // vinculadas, el backend ya convirtió su peso/puntaje — se avisa
        // cuáles, en vez de que el docente lo descubra reabriéndolas una
        // por una. Un solo aviso por pantalla (`queueNotice`), así que se
        // agrega al mismo mensaje de éxito en vez de perderlo.
        const avisoConversion =
          result.actividadesAfectadas.length > 0
            ? ` Se convirtió el peso/puntaje de: ${result.actividadesAfectadas.map((a) => a.titulo).join(", ")}.`
            : ""
        queueNotice(`${mensajeUnidadGuardada("actualizado", instrumento)}${avisoConversion}`)
        onClose(instrumento)
      },
      // Mismo bug que tenía `planeador-crear-unidad-page.tsx`: ignoraba el
      // `error` de la mutación y mostraba siempre este texto quemado.
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  // `draft`/`initialDraft` arrancan en `null` y se completan juntos apenas
  // llega `unidad` (y `referente`, para no perder la precarga de
  // enunciados) — así el form no se monta hasta tener datos reales, y el
  // footer no arranca "dirty" antes de tiempo.
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
            <Spinner /> Cargando…
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
              const data = draftToPayload(current)
              // Método ANTERIOR = el que trae `unidad` (lo que ya está
              // guardado, de antes de que el docente tocara nada) — NO
              // `initialDraft.metodoCalculo`, que es lo mismo pero por
              // claridad se compara contra la fuente real. Método NUEVO =
              // lo que el docente eligió en el form (`current`).
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
              // `ENUNCIADOS` en el PUT (sso V492) reemplaza la lista
              // completa en una sola llamada — agregados y quitados del
              // picker de "Derechos Básicos de Aprendizaje" viajan juntos
              // en `useUpdateUnidad`, no hace falta desvincular aparte.
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
                  rotuloUnidad={instrumento}
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
              disabled={!current?.nombre.trim() || updateMutation.isPending || actividadesPending}
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

      {/* Alerta del cambio de método de cálculo (Regla pedida, ver el
          comentario de `actividadesVinculadas` más arriba): se abre
          programáticamente desde el submit, no desde un trigger — por eso
          no lleva `AlertDialogTrigger`, mismo patrón que otros diálogos
          controlados del repo. */}
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
