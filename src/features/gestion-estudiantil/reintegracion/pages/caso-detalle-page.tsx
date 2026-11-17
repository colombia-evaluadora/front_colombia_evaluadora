import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { useCasoQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import { CasoDetalleContenido } from "@/features/gestion-estudiantil/reintegracion/components/detalle/caso-detalle-contenido"

/** Caso de reintegración (G.9.CAS.1-2). Abrirlo deja traza de consulta: no se cachea. */
export function CasoDetallePage({ casoId }: { casoId: number }) {
  const q = useCasoQuery(casoId)
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró el caso solicitado." className="m-6" />
        ) : (
          <CasoDetalleContenido caso={q.data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
