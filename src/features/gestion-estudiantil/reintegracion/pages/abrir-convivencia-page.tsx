import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { useCasoQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import { FormularioAbrirConvivencia } from "@/features/gestion-estudiantil/reintegracion/components/formulario-abrir-convivencia"

/** Abrir caso de convivencia desde el caso de reintegración (Regla 24). */
export function AbrirConvivenciaPage({ casoId }: { casoId: number }) {
  const q = useCasoQuery(casoId)
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró el caso solicitado." className="m-6" />
        ) : q.data.caso_convivencia ? (
          <ErrorNoticeBanner error fallback="Este caso ya tiene un caso de convivencia vinculado." className="m-6" />
        ) : (
          <FormularioAbrirConvivencia caso={q.data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
