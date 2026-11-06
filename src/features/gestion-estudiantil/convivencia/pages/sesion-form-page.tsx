import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"

import { IconoCarga } from "@/features/gestion-estudiantil/components/icono-carga"
import type { ComiteDetalle, PeriodoComite, SesionDetalle } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { useComiteQuery, usePeriodosComiteQuery, useSesionQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-comite-query"
import { useConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { SeccionAsistentes } from "@/features/gestion-estudiantil/convivencia/components/comite/sesion/seccion-asistentes"
import { SeccionCasosTratados } from "@/features/gestion-estudiantil/convivencia/components/comite/sesion/seccion-casos-tratados"
import { SeccionDatosSesion } from "@/features/gestion-estudiantil/convivencia/components/comite/sesion/seccion-datos-sesion"
import { SeccionInvitados } from "@/features/gestion-estudiantil/convivencia/components/comite/sesion/seccion-invitados"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { useSesionForm } from "@/features/gestion-estudiantil/convivencia/hooks/use-sesion-form"
import { LIM, periodoPorDefecto, rotuloPeriodo } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface FormProps {
  periodo: PeriodoComite
  comite: ComiteDetalle
  sesion?: SesionDetalle
}

function SesionForm({ periodo, comite, sesion }: FormProps) {
  const form = useSesionForm({ periodo: periodo.fk_periodo, comite, sesion })
  const { v, set, errores } = form

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={form.volver} disabled={form.guardando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={form.guardar} disabled={form.guardando}>
                <IconoCarga cargando={form.guardando}><FloppyDiskIcon data-icon="inline-start" /></IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          {sesion ? `Convivencia › Comité › Sesión ${sesion.numero} › Modificar` : "Convivencia › Comité › Nueva sesión"}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-6">
          <SeccionDatosSesion form={form} periodoRotulo={rotuloPeriodo(periodo)} />
          <SeccionAsistentes form={form} />
          <SeccionInvitados form={form} />
          <SeccionCasosTratados form={form} comite={comite.fk_comite as number} periodo={periodo.fk_periodo} />
          <TextoLargo
            id="sesion-otros"
            label="Otros temas"
            rows={4}
            max={LIM.otros}
            value={v.otros}
            error={errores.otros}
            onChange={(otros) => set({ otros })}
          />
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

/** Nueva sesión o Modificar (G.2.COM.SES.3). El período o la sesión llegan por props desde router.tsx. */
export function SesionFormPage({ periodo, sesionId }: { periodo?: number; sesionId?: number }) {
  const { puedeGestionarComite } = useConvivenciaAccess()
  const periodos = usePeriodosComiteQuery()
  const sesion = useSesionQuery(sesionId ?? null)
  const lista = periodos.data ?? []
  // Al modificar, el período es el del Comité de la sesión.
  const actual = sesionId != null
    ? lista.find((p) => p.fk_comite != null && p.fk_comite === sesion.data?.fk_comite)
    : (lista.find((p) => p.fk_periodo === periodo) ?? periodoPorDefecto(lista))
  const comite = useComiteQuery(actual?.fk_periodo ?? null)

  const cargando = periodos.isPending || (sesionId != null && sesion.isPending) || (actual != null && comite.isPending)
  const error = periodos.error ?? sesion.error ?? comite.error

  return (
    <NoticeProvider>
      <TableScreen>
        {!puedeGestionarComite ? (
          <Alert className="m-6 w-auto">
            <InfoIcon aria-hidden="true" />
            <AlertDescription>No tiene permiso para registrar sesiones del Comité.</AlertDescription>
          </Alert>
        ) : cargando ? (
          <Skeleton className="m-6 h-96" />
        ) : error || !actual || !comite.data || (sesionId != null && !sesion.data) ? (
          <ErrorNoticeBanner error={error ?? true} fallback="No se encontró el Comité de este período." className="m-6" />
        ) : comite.data.fk_comite == null ? (
          <Alert className="m-6 w-auto">
            <InfoIcon aria-hidden="true" />
            <AlertDescription>Este período aún no tiene Comité: registre primero a sus integrantes.</AlertDescription>
          </Alert>
        ) : (
          <SesionForm key={sesion.data?.id ?? "nueva"} periodo={actual} comite={comite.data} sesion={sesion.data ?? undefined} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
