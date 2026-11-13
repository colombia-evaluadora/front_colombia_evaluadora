import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { useEstrategiaQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-estrategias-query"
import { PantallaEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/pantalla-estrategia"

/** Beneficiarios que trae el formulario de modificar; el resto se ve en el detalle («… y N beneficiarios más»). */
const BENEFICIARIOS_VISIBLES = 50

/** Nueva estrategia de permanencia (G.8.EST.4): sin bloque Beneficiarios hasta el primer guardado. */
export function EstrategiaNuevaPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <PantallaEstrategia />
      </TableScreen>
    </NoticeProvider>
  )
}

/** Modificar estrategia (G.8.EST.4): el Período Académico no cambia; con los beneficiarios y su Retirar. */
export function EstrategiaEditarPage({ estrategiaId }: { estrategiaId: number }) {
  const q = useEstrategiaQuery(estrategiaId, { pageIndex: 0, pageSize: BENEFICIARIOS_VISIBLES })
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró la estrategia solicitada." className="m-6" />
        ) : (
          <PantallaEstrategia estrategia={q.data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
