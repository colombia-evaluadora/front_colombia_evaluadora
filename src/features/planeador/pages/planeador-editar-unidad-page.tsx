import { useState } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
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
import { isNotFoundError } from "@/lib/api-client"

import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUpdateUnidad } from "@/features/planeador/api/mutations/update-unidad"
import {
  UnidadInfoGeneralFields,
  draftFromUnidad,
  draftToPayload,
  type UnidadDraft,
} from "@/features/planeador/components/forms/form-unidad-info-general"
import { UnidadFormTabs } from "@/features/planeador/components/forms/unidad-form-tabs"

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
  const { notify } = useNotify()

  const updateMutation = useUpdateUnidad({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message ?? "No se pudo actualizar la unidad temática.", {
            variant: "error",
          })
          return
        }
        notify("Unidad temática actualizada correctamente.")
        onClose()
      },
      onError: () => {
        notify("No se pudo actualizar la unidad temática.", { variant: "error" })
      },
    },
  })

  // `draft` arranca en `null` y se completa apenas llega `unidad` — así el
  // form no se monta hasta tener datos reales para precargar.
  const current = draft ?? (unidad ? draftFromUnidad(unidad) : null)

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
          Editar unidad
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody className="rounded-b-none border-b-0">
        {isPending && (
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
            onSubmit={(e) => {
              e.preventDefault()
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
        <p className="text-sm">Guarda para conservar los cambios.</p>
        <Button
          type="submit"
          form={FORM_ID}
          color="primary"
          variant="fill"
          size="sm"
          disabled={!current?.nombre.trim() || updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <SpinnerIcon data-icon="inline-start" className="animate-spin" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          {updateMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </TableScreenFooter>
    </TableScreen>
  )
}
