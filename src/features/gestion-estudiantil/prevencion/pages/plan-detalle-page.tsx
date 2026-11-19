import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { usePlanQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-valoraciones-query"
import { PlanDetalleContenido } from "@/features/gestion-estudiantil/prevencion/components/plan/detalle/plan-detalle-contenido"

/** Detalle del plan de acompañamiento (G.8.VAL.5): acciones, avances y aceptación; el ⋮ del encabezado trae sus operaciones. */
export function PlanDetallePage({ planId }: { planId: number }) {
  const q = usePlanQuery(planId)
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró el plan solicitado." className="m-6" />
        ) : (
          <PlanDetalleContenido plan={q.data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
