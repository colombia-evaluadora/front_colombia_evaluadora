import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

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
import { paths } from "@/config/paths"

import { useCreateUnidad } from "@/features/planeador/api/mutations/create-unidad"
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

const FORM_ID = "crear-unidad-form"

/**
 * Alta de una unidad temática en una ruta aparte — mismo patrón que
 * `planeador-crear-actividad-page.tsx`: form en blanco, footer siempre
 * visible con "Guardar" (un form recién abierto nunca está "ya guardado").
 *
 * Solo cubre "Información general": los criterios y las actividades
 * vinculadas se agregan después, desde el panel de detalle de la unidad ya
 * creada (mismos diálogos "Agregar criterio"/"Vincular actividad" de
 * siempre) — no tiene sentido pedirlos acá, antes de que la unidad exista.
 */
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
  // Rótulo dinámico ("Unidad temática"/"Proyecto pedagógico"/…, ver
  // `planeador-tabs.tsx`) para el mensaje de éxito — el mismo texto fijo
  // "Unidad temática" no tenía sentido para un docente de Preescolar.
  const instrumento = useUnidadInstrumentoLabel(draft.gradoId)
  // "Nueva unidad temática"/"Nuevo proyecto pedagógico" — mismo criterio de
  // género que `mensajeUnidadGuardada` (arriba). El título de la pantalla y
  // su descripción venían fijos en "unidad"/"unidad temática", igual que el
  // resto de textos de acá antes de este cambio.
  const esMasculino = articuloDefinido(instrumento) === "el"
  const nuevoInstrumento = `Nuevo${esMasculino ? "" : "a"} ${instrumento.toLowerCase()}`
  // Sin form-library acá (`draft` es estado plano): "hay cambios" se
  // resuelve comparando contra el borrador vacío con el que arrancó la
  // página — mismo criterio de footer sticky que
  // `planeador-editar-actividad-page.tsx` (`isDirty`).
  const isDirty = JSON.stringify(draft) !== JSON.stringify(UNIDAD_DRAFT_VACIO)

  const createMutation = useCreateUnidad({
    mutationConfig: {
      onSuccess: () => {
        // `navigate` deja esta pantalla — un `notify()` acá se perdería con
        // el `NoticeProvider` de esta pantalla al desmontarse.
        queueNotice(mensajeUnidadGuardada("creado", instrumento))
        navigate({ to: paths.app.planeadorUnidades.getHref() })
      },
      onError: () => {
        notify(`No se pudo crear ${articuloDefinido(instrumento)} ${instrumento.toLowerCase()}.`, {
          variant: "error",
        })
      },
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
              render={<Link to={paths.app.planeadorUnidades.getHref()} />}
            >
              Cerrar
            </Button>
          }
        >
          {nuevoInstrumento}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody className="rounded-b-none border-b-0">
        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate(draftToPayload(draft))
          }}
        >
          <UnidadFormTabs
            esFormativo={draft.enfoquePedagogico === "Formativo"}
            infoGeneralContent={
              <UnidadInfoGeneralFields
                draft={draft}
                onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
              />
            }
          />
        </form>
      </TableScreenBody>

      <TableScreenFooter>
        {isDirty ? (
          <>
            <p className="text-sm">Completa los datos y guarda para crear {articuloDefinido(instrumento)} {instrumento.toLowerCase()}.</p>
            <Button
              type="submit"
              form={FORM_ID}
              color="primary"
              variant="fill"
              size="sm"
              disabled={!draft.nombre.trim() || createMutation.isPending}
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
