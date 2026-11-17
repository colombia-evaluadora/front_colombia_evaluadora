import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { useActividadQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import type { ActividadDetalle } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { FormularioActividad } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/form/formulario-actividad"
import { useActividadForm } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-actividad-form"

function ActividadFormContent({ actividad }: { actividad?: ActividadDetalle }) {
  const f = useActividadForm(actividad)
  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={f.pending} onClick={f.volver}>
                Cancelar
              </Button>
              <Button size="sm" type="button" disabled={f.pending} onClick={f.guardar}>
                <IconoCarga cargando={f.pending}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          {actividad ? `Actividades › ${actividad.nombre} › Modificar` : "Actividades › Nueva actividad"}
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <FormularioActividad f={f} />
      </TableScreenBody>
    </>
  )
}

/** Nueva actividad (sin `actividadId`) o Modificar actividad (G.5.ACT.NUE). */
export function ActividadFormPage({ actividadId }: { actividadId?: number }) {
  const { puedeVer, isLoading } = useMenuPermission("ACTIVIDADES_EXTRACURRICULARES")
  const q = useActividadQuery(actividadId)

  if (!isLoading && !puedeVer) {
    return (
      <Alert variant="destructive" className="m-4 w-auto">
        <AlertDescription>No tiene acceso a las actividades extracurriculares.</AlertDescription>
      </Alert>
    )
  }

  return (
    <NoticeProvider>
      <TableScreen>
        {actividadId == null ? (
          <ActividadFormContent />
        ) : q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró la actividad solicitada." className="m-6" />
        ) : !q.data.puede_editar ? (
          <Alert variant="destructive" className="m-4 w-auto">
            <AlertDescription>No tiene permiso para modificar esta actividad.</AlertDescription>
          </Alert>
        ) : (
          <ActividadFormContent key={q.data.id} actividad={q.data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
