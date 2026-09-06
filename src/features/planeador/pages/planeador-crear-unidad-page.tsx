import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
  const navigate = useNavigate()
  const [draft, setDraft] = useState<UnidadDraft>(UNIDAD_DRAFT_VACIO)

  const createMutation = useCreateUnidad({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Unidad temática creada correctamente.")
        navigate({ to: paths.app.planeadorUnidades.getHref() })
      },
      onError: () => {
        toast.error("No se pudo crear la unidad temática.")
      },
    },
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description="Completa la información para crear una nueva unidad temática"
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
          Nueva unidad
        </TableScreenTitle>
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
        <p className="text-sm">Completa los datos y guarda para crear la unidad.</p>
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
      </TableScreenFooter>
    </TableScreen>
  )
}
