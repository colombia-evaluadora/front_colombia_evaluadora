import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { useValoracionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-valoraciones-query"
import { ValoracionDetalleContenido } from "@/features/gestion-estudiantil/prevencion/components/valoracion/detalle/valoracion-detalle-contenido"

/** Detalle de una valoración sin plan (o su análisis): nivel, análisis y anulación. */
export function ValoracionDetallePage({ valoracionId }: { valoracionId: number }) {
  const q = useValoracionQuery(valoracionId)
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró la valoración solicitada." className="m-6" />
        ) : (
          <ValoracionDetalleContenido valoracion={q.data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
