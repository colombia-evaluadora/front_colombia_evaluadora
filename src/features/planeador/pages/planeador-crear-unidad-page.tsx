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
import { LoadingLabel } from "@/components/offline/loading-label"
import { paths } from "@/config/paths"
import { useOfflineWritable } from "@/lib/offline/outbox/hooks"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"

import { useCrearUnidadSaga } from "@/features/planeador/offline/use-unidad-saga"
import { SAGA_QUEUED_MESSAGE } from "@/features/planeador/offline/saga-messages"
import { useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { useRotuloActividadQuery } from "@/features/planeador/api/query/use-rotulo-actividad-query"
import {
  UNIDAD_DRAFT_VACIO,
  UnidadInfoGeneralFields,
  draftToPayload,
  type UnidadDraft,
} from "@/features/planeador/components/forms/form-unidad-info-general"
import { UnidadFormTabs } from "@/features/planeador/components/forms/unidad-form-tabs"
import {
  articuloDefinido,
  mensajeUnidadGuardada,
  useUnidadInstrumentoLabel,
} from "@/features/planeador/lib/unidad-instrumento-label"
import { planeadorUnidadCrearRoute } from "@/router"

const FORM_ID = "crear-unidad-form"

/** Solo "Información general": criterios y actividades se agregan desde el detalle, cuando la unidad ya existe. */
export function PlaneadorCrearUnidadPage() {
  return (
    <NoticeProvider>
      <PlaneadorCrearUnidadPageContent />
    </NoticeProvider>
  )
}

function PlaneadorCrearUnidadPageContent() {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [draft, setDraft] = useState<UnidadDraft>(UNIDAD_DRAFT_VACIO)

  // El router solo gatea por sesión: sin "crear" se redirige al listado.
  const { puedeCrear, isLoading: isLoadingPermiso } = usePlaneadorSoloLectura()
  useEffect(() => {
    if (!isLoadingPermiso && !puedeCrear) {
      navigate({ to: paths.app.planeadorUnidades.getHref(), replace: true })
    }
  }, [isLoadingPermiso, puedeCrear, navigate])

  // `?instrumento=` da el instrumento desde el primer render (sin esperar Grado) y acota Grado/Asignatura a esa pestaña.
  const search = useSearch({ from: planeadorUnidadCrearRoute.id })
  const { data: unidadTabs } = useUnidadesTabsQuery()
  const tabDesdeAgregar = unidadTabs?.find((tab) => tab.instrumento === search.instrumento)
  // Rótulo dinámico (Preescolar = "Proyecto pedagógico"); sin `?instrumento=` se deriva del Grado elegido.
  const instrumentoPorGrado = useUnidadInstrumentoLabel(draft.gradoId)
  const instrumento = tabDesdeAgregar?.instrumento ?? instrumentoPorGrado
  // Rótulo de actividad (Regla 13): en el alta no hay `rotuloEjecucion`, sale del Grado/Asignatura del borrador.
  const { data: rotuloActividad } = useRotuloActividadQuery(
    draft.gradoId ?? tabDesdeAgregar?.grados[0]?.id,
    draft.asignaturaId,
  )
  // Título "Crear X" (no "Nuevo/a X") para no concordar género con el instrumento.
  const esMasculino = articuloDefinido(instrumento) === "el"
  // `draft` es estado plano: "hay cambios" = distinto del borrador vacío inicial.
  const isDirty = JSON.stringify(draft) !== JSON.stringify(UNIDAD_DRAFT_VACIO)

  // Saga de un paso (Fase 3 offline): sin red queda en la outbox.
  const escritura = useOfflineWritable("Necesitas conexión para crear unidades en este equipo.")
  const createMutation = useCrearUnidadSaga({
    onQueued: () => {
      queueNotice(SAGA_QUEUED_MESSAGE)
      navigate({ to: paths.app.planeadorUnidades.getHref(), search: { instrumento } })
    },
    onSuccess: () => {
      // `queueNotice`: un `notify()` se perdería al desmontarse esta pantalla.
      queueNotice(mensajeUnidadGuardada("creado", instrumento))
      // Vuelve a la misma pestaña (y su miga de pan).
      navigate({ to: paths.app.planeadorUnidades.getHref(), search: { instrumento } })
    },
    // Mensaje real del backend (409 duplicado, 400 validación), no un texto genérico.
    onError: (mensaje: string) => {
      notify(mensaje, { variant: "error" })
    },
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description={`Completa la información para crear ${esMasculino ? "un" : "una"} ${instrumento.toLowerCase()}`}
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
          {`Crear ${instrumento.toLowerCase()}`}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody className="rounded-b-none border-b-0">
        {isLoadingPermiso || !puedeCrear ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <LoadingLabel>Cargando…</LoadingLabel>
          </div>
        ) : (
          <form
            id={FORM_ID}
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate(draftToPayload(draft))
            }}
          >
            <UnidadFormTabs
              esFormativo={draft.enfoquePedagogico === "Formativo"}
              rotuloActividad={rotuloActividad?.rotulo}
              rotuloUnidad={instrumento}
              infoGeneralContent={
                <UnidadInfoGeneralFields
                  draft={draft}
                  onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
                  tab={tabDesdeAgregar}
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
            <p className="text-sm">Completa los datos y guarda para continuar.</p>
            <Button
              type="submit"
              form={FORM_ID}
              color="primary"
              variant="fill"
              size="sm"
              disabled={!draft.nombre.trim() || createMutation.isPending || escritura.disabled}
              title={escritura.tooltip ?? undefined}
            >
              {createMutation.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {createMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </>
        ) : (
          <span />
        )}
      </TableScreenFooter>
    </TableScreen>
  )
}
