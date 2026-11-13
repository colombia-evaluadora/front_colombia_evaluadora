import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useActividadQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import { ActividadDetalleContenido } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/detalle/actividad-detalle-contenido"

/** Detalle de la actividad (G.5.ACT.DET.1). */
export function ActividadDetallePage({ actividadId }: { actividadId: number }) {
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
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró la actividad solicitada." className="m-6" />
        ) : (
          <ActividadDetalleContenido actividad={q.data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
