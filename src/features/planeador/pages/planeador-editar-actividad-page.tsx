import { useState } from "react"
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

import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUpdateActividad } from "@/features/planeador/api/mutations/update-actividad"
import { useLinkActividadUnidad } from "@/features/planeador/api/mutations/link-actividad-unidad"
import { useUnlinkActividadUnidad } from "@/features/planeador/api/mutations/unlink-actividad-unidad"
import { useAgregarEvidenciaActividad } from "@/features/planeador/api/mutations/agregar-evidencia-actividad"
import { EditarActividadForm } from "@/features/planeador/components/forms/form-editar-actividad"
import type { Actividad } from "@/features/planeador/api/types/actividad"

const FORM_ID = "editar-actividad-form"

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

  const {
    data: actividad,
    isPending,
    isError,
    error,
  } = useActividadDetalleQuery(actividadId ? Number(actividadId) : undefined)

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
        isPending={isPending}
        isError={isError}
        actividad={actividad}
        onClose={() => navigate({ to: paths.app.planeadorActividades.getHref() })}
      />
    </NoticeProvider>
  )
}

function EditarActividadPageContent({
  isPending,
  isError,
  actividad,
  onClose,
}: {
  isPending: boolean
  isError: boolean
  actividad: ReturnType<typeof useActividadDetalleQuery>["data"]
  onClose: () => void
}) {
  const [isDirty, setIsDirty] = useState(false)
  const { notify } = useNotify()

  // Para resolver si la unidad NUEVA (si el docente la cambió en el
  // select) calcula por "Ponderado" — ver el comentario de `handleSubmit`.
  const { data: unidadesResult } = useUnidadesQuery()
  const unidades = unidadesResult?.rows ?? []

  const updateMutation = useUpdateActividad({
    mutationConfig: {
      onSuccess: () => {
        // `onClose` navega de vuelta al Planeador: un `notify()` acá
        // actualizaría el `NoticeProvider` de ESTA pantalla, que se
        // desmonta antes de que el aviso llegue a pintarse. `queueNotice`
        // lo deja para que lo muestre el `NoticeProvider` del Planeador.
        queueNotice("Actividad actualizada correctamente.")
        setIsDirty(false)
        onClose()
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  // `update-actividad.ts` (`PUT /actividades/:id`) nunca manda `FK_TUNIDAD`:
  // reasignar la unidad de una actividad ya vinculada se delega acá, en las
  // rutas dedicadas de la carpeta 2 (`PUT .../unidades/:id/actividades/:act`
  // para vincular/mover, `PATCH .../unidades/actividades/:act` para
  // desvincular) — antes el `<Select>` de "Unidad temática asociada" del
  // form dejaba elegir otra unidad sin que el guardado hiciera nada con
  // eso, y encima el PUT seguía mandando `PONDERACION` calculado contra la
  // unidad NUEVA (todavía no aplicada) mientras el backend seguía
  // validándola contra la unidad VIEJA (la única que de verdad seguía
  // vinculada) — de ahí el 400 al cambiar de unidad en una actividad que
  // ya tenía una.
  const linkActividad = useLinkActividadUnidad()
  const unlinkActividad = useUnlinkActividadUnidad({ unidadId: actividad?.unidad.id ?? 0 })
  // Solo AGREGA evidencias nuevas (ver el comentario de `Actividad.
  // evidenciasIds`): no hay endpoint confirmado para desvincular una ya
  // relacionada, así que el checklist del form las deja tildadas y
  // deshabilitadas — nunca aparecen en el diff de `handleSubmit`.
  const agregarEvidencia = useAgregarEvidenciaActividad({
    mutationConfig: {
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })
  const isSavingUnidad = linkActividad.isPending || unlinkActividad.isPending

  async function handleSubmit(values: Actividad) {
    if (!actividad) return
    const unidadAnteriorId = actividad.unidad.id
    const unidadNuevaId = values.unidad.id

    if (unidadNuevaId !== unidadAnteriorId) {
      try {
        if (unidadNuevaId === 0) {
          await unlinkActividad.mutateAsync(actividad.id)
        } else {
          const unidadNueva = unidades.find((u) => u.id === unidadNuevaId)
          const esPonderado = unidadNueva?.metodoCalculo === "Ponderado"
          await linkActividad.mutateAsync({
            unidadId: unidadNuevaId,
            actividadId: actividad.id,
            // Mismo criterio que `DialogAgregarActividad.handleVincular`:
            // solo se manda la ponderación tipeada si la unidad NUEVA
            // calcula por "Ponderado" — con Promedio simple/Sumatoria el
            // backend rechaza un peso puesto a mano.
            ponderacion: esPonderado ? values.ponderacion : 0,
            // Obligatorio en `true` cuando la actividad YA estaba en OTRA
            // unidad (no una huérfana que recién se vincula).
            permitirMoverDeUnidad: unidadAnteriorId !== 0,
          })
        }
      } catch (error) {
        notify(getErrorMessage(error), { variant: "error" })
        return
      }
    }

    updateMutation.mutate({ actividadId: actividad.id, data: values })

    // Evidencias marcadas en este submit que todavía no estaban
    // relacionadas — cada una es su propio `POST`, no hay bulk confirmado.
    const evidenciasNuevas = values.evidenciasIds.filter(
      (id) => !actividad.evidenciasIds.includes(id),
    )
    for (const evidenciaId of evidenciasNuevas) {
      agregarEvidencia.mutate({ actividadId: actividad.id, evidenciaId })
    }
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
        {isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando actividad…
          </div>
        )}

        {isError && (
          <p className="text-red px-6 py-12 text-center text-sm">
            Ocurrió un error al cargar la actividad.
          </p>
        )}

        {actividad && (
          <EditarActividadForm
            key={actividad.id}
            actividad={actividad}
            formId={FORM_ID}
            onDirtyChange={setIsDirty}
            onSubmit={handleSubmit}
          />
        )}
      </TableScreenBody>

      {/* El footer es el que avisa y guarda; aparece solo cuando hay cambios.
          Sigue el patrón de `add-establishment-page`: siempre está montado
          (preserva el layout del `TableScreen`), pero su contenido solo
          pinta el aviso + el Guardar cuando `isDirty`. */}
      <TableScreenFooter>
        {isDirty ? (
          <>
            <p className="text-sm">Se detectaron cambios. Guardar para conservar la información.</p>
            <Button
              type="submit"
              form={FORM_ID}
              color="primary"
              variant="fill"
              size="sm"
              disabled={updateMutation.isPending || isSavingUnidad}
            >
              {updateMutation.isPending || isSavingUnidad ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {updateMutation.isPending || isSavingUnidad ? "Guardando..." : "Guardar"}
            </Button>
          </>
        ) : (
          <span />
        )}
      </TableScreenFooter>
    </TableScreen>
  )
}
