import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"

import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useServicioSocialEstudianteQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-servicio-social-query"
import { ServicioSocialContenido } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/servicio-social/servicio-social-contenido"

/** Servicio social de un estudiante (G.5.SOC.DET.1), por matrícula. */
export function ServicioSocialEstudiantePage({ matricula }: { matricula: number }) {
  const { puedeVer, isLoading } = useMenuPermission("ACTIVIDADES_EXTRACURRICULARES")
  const q = useServicioSocialEstudianteQuery(matricula)

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
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró el estudiante solicitado." className="m-6" />
        ) : (
          <TablePaginationProvider>
            <ServicioSocialContenido detalle={q.data} />
          </TablePaginationProvider>
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
