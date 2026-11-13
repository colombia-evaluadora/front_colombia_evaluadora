import { TableScreen } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"

import { EstrategiaDetalleContenido } from "@/features/gestion-estudiantil/prevencion/components/estrategias/detalle/estrategia-detalle-contenido"

/** Detalle de la estrategia de permanencia (G.8.EST.7): ficha, efectividad y beneficiarios con Retirar. */
export function EstrategiaDetallePage({ estrategiaId }: { estrategiaId: number }) {
  return (
    <NoticeProvider>
      <TableScreen>
        {/* Paginación en estado local: la URL de la página de detalle no lleva `page`. */}
        <TablePaginationProvider defaultPageSize={20}>
          <EstrategiaDetalleContenido estrategiaId={estrategiaId} />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
