import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { useSenalSMQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-salud-mental-query"
import { SenalDetalleContenido } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/detalle/senal-detalle-contenido"

/** Señal de salud mental (G.8.SAL.4-6): reporte, valoración y atención. Abrirla deja traza de consulta (Regla 21). */
export function SenalSaludMentalPage({ senalId }: { senalId: number }) {
  const q = useSenalSMQuery(senalId)
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró la señal solicitada." className="m-6" />
        ) : (
          <SenalDetalleContenido senal={q.data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
