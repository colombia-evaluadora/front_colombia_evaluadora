import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { usePlanQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-valoraciones-query"
import { FormularioAbrirCaso } from "@/features/gestion-estudiantil/prevencion/components/plan/caso/formulario-abrir-caso"

/** Abrir caso de convivencia desde el plan (Regla 24). */
export function AbrirCasoPage({ planId }: { planId: number }) {
  const q = usePlanQuery(planId)
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró el plan solicitado." className="m-6" />
        ) : q.data.caso_convivencia ? (
          <ErrorNoticeBanner error fallback="Este plan ya tiene un caso de convivencia vinculado." className="m-6" />
        ) : (
          <FormularioAbrirCaso plan={q.data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
