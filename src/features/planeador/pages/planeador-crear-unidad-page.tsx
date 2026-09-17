import { useState } from "react"
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
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"

import { useCreateUnidad } from "@/features/planeador/api/mutations/create-unidad"
import { useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"
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

  // `?instrumento=` llega cuando se entra desde el botón "Agregar
  // {instrumento}" de una pestaña (`planeador-unidades-page.tsx`) — permite
  // saber DESDE EL PRIMER RENDER qué instrumento se está creando, sin
  // esperar a que el docente elija un Grado (que es lo único de lo que
  // `useUnidadInstrumentoLabel` puede derivarlo). Con esa pestaña identificada
  // también se acotan los `<Select>` de Grado/Asignatura a los que caen bajo
  // ESE instrumento (`tabDesdeAgregar.grados`/`.asignaturas`, ver
  // `UnidadInfoGeneralFields`) en vez de todo el catálogo del docente.
  const search = useSearch({ from: planeadorUnidadCrearRoute.id })
  const { data: unidadTabs } = useUnidadesTabsQuery()
  const tabDesdeAgregar = unidadTabs?.find((tab) => tab.instrumento === search.instrumento)
  // Rótulo dinámico ("Unidad temática"/"Proyecto pedagógico"/…, ver
  // `planeador-tabs.tsx`) para el título y el mensaje de éxito — el mismo
  // texto fijo "Unidad temática" no tenía sentido para un docente de
  // Preescolar. Sin `?instrumento=` (entrada directa a la URL, sin pasar por
  // el botón "Agregar") cae al criterio anterior, derivado del Grado ya
  // elegido en el form.
  const instrumentoPorGrado = useUnidadInstrumentoLabel(draft.gradoId)
  const instrumento = tabDesdeAgregar?.instrumento ?? instrumentoPorGrado
  // El título de la pantalla y su descripción venían fijos en
  // "unidad"/"unidad temática", igual que el resto de textos de acá antes de
  // este cambio. "Crear X" (no "Nuevo/a X") evita tener que concordar
  // género con el instrumento — mismo criterio que ya usa el título de
  // `planeador-editar-unidad-page.tsx` ("Editar X"). El anterior
  // `Nuevo${esMasculino ? "" : "a"}` producía literalmente "Nuevoa unidad
  // temática" para el caso femenino: concatenar "a" a continuación de
  // "Nuevo" no da "Nueva".
  const esMasculino = articuloDefinido(instrumento) === "el"
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
      // Antes esto ignoraba el `error` de la mutación y siempre mostraba
      // este mismo texto quemado, así que un 409 por nombre duplicado o un
      // 400 de validación real se leían igual que un fallo de red genérico
      // — sin pista de qué corregir. `getErrorMessage` ya trae su propio
      // fallback genérico si el backend no manda `message`.
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
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
          {`Crear ${instrumento.toLowerCase()}`}
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
                tab={tabDesdeAgregar}
              />
            }
          />
        </form>
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
