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

import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import { useUpdateUnidad } from "@/features/planeador/api/mutations/update-unidad"
import { useUnlinkEnunciadoUnidad } from "@/features/planeador/api/mutations/unlink-enunciado-unidad"
import {
  UnidadInfoGeneralFields,
  draftFromUnidad,
  draftToPayload,
  type UnidadDraft,
} from "@/features/planeador/components/forms/form-unidad-info-general"
import { UnidadFormTabs } from "@/features/planeador/components/forms/unidad-form-tabs"
import {
  mensajeUnidadGuardada,
  useUnidadInstrumentoLabel,
} from "@/features/planeador/lib/unidad-instrumento-label"

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
        unidad={unidad}
        onClose={() => navigate({ to: paths.app.planeadorUnidades.getHref() })}
      />
    </NoticeProvider>
  )
}

function EditarUnidadPageContent({
  isPending,
  isError,
  unidad,
  onClose,
}: {
  isPending: boolean
  isError: boolean
  unidad: ReturnType<typeof useUnidadDetalleQuery>["data"]
  onClose: () => void
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
  const instrumento = useUnidadInstrumentoLabel(unidad?.gradoId)

  // `unidad.enunciadosDba` (del detalle) siempre llega vacío contra el
  // backend real (viven en un endpoint aparte — ver el comentario de
  // `UnidadTematica.enunciadosDba`); los que la unidad YA tiene relacionados
  // salen de acá, con el `pkRelacion` que exige desvincular uno.
  const { data: referente, isPending: referentePending } = useUnidadReferenteQuery(unidad?.id)
  const unlinkEnunciado = useUnlinkEnunciadoUnidad()

  const updateMutation = useUpdateUnidad({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message ?? `No se pudo actualizar ${instrumento.toLowerCase()}.`, {
            variant: "error",
          })
          return
        }
        // `onClose` navega de vuelta al listado de unidades — un `notify()`
        // acá se perdería con el `NoticeProvider` de esta pantalla al
        // desmontarse.
        queueNotice(mensajeUnidadGuardada("actualizado", instrumento))
        onClose()
      },
      onError: () => {
        notify(`No se pudo actualizar ${instrumento.toLowerCase()}.`, { variant: "error" })
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
              render={<Link to={paths.app.planeadorUnidades.getHref()} />}
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
        {(isPending || (!isError && unidad && !current)) && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando unidad…
          </div>
        )}

        {isError && (
          <p className="text-red px-6 py-12 text-center text-sm">
            Ocurrió un error al cargar la unidad temática.
          </p>
        )}

        {unidad && current && (
          <form
            id={FORM_ID}
            onSubmit={async (e) => {
              e.preventDefault()
              // Enunciados que estaban relacionados y el docente sacó del
              // picker: se desvinculan uno por uno (`PATCH .../unidades/
              // enunciados/:pkRelacion`, confirmado real) — no hay endpoint
              // confirmado para AGREGAR uno nuevo a una unidad ya creada
              // (solo al crearla), así que un alta nueva en el picker no se
              // manda todavía.
              const idsActuales = new Set(current.enunciadosDba.map((e) => e.id))
              const quitados = (referente?.enunciados ?? []).filter((e) => !idsActuales.has(e.id))
              for (const enunciado of quitados) {
                try {
                  await unlinkEnunciado.mutateAsync({
                    unidadId: unidad.id,
                    pkRelacion: enunciado.pkRelacion,
                  })
                } catch (error) {
                  notify(getErrorMessage(error), { variant: "error" })
                  return
                }
              }
              updateMutation.mutate({ unidadId: unidad.id, data: draftToPayload(current) })
            }}
          >
            <UnidadFormTabs
              unidad={unidad}
              esFormativo={current.enfoquePedagogico === "Formativo"}
              infoGeneralContent={
                <UnidadInfoGeneralFields
                  draft={current}
                  onChange={(patch) => setDraft({ ...current, ...patch })}
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
              disabled={!current?.nombre.trim() || updateMutation.isPending || unlinkEnunciado.isPending}
            >
              {updateMutation.isPending || unlinkEnunciado.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {updateMutation.isPending || unlinkEnunciado.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </>
        ) : (
          <span />
        )}
      </TableScreenFooter>
    </TableScreen>
  )
}
