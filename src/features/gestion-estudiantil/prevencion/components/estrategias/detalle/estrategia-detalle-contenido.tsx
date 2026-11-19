import { TableScreenBody } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Skeleton } from "@/components/ui/skeleton"

import { EfectividadEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/detalle/efectividad-estrategia"
import { EncabezadoEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/detalle/encabezado-estrategia"
import { FichaEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/detalle/ficha-estrategia"
import { TablaBeneficiarios } from "@/features/gestion-estudiantil/prevencion/components/estrategias/detalle/tabla-beneficiarios"
import { useEstrategiaDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-estrategia-detalle"

/** Contenido de la página de detalle de una estrategia: ficha, efectividad y beneficiarios (G.8.EST.7). */
export function EstrategiaDetalleContenido({ estrategiaId }: { estrategiaId: number }) {
  const d = useEstrategiaDetalle(estrategiaId)
  const e = d.estrategia
  if (d.query.isPending) return <Skeleton className="m-6 h-96" />
  if (!e) return <ErrorNoticeBanner error={d.query.error ?? true} fallback="No se encontró la estrategia solicitada." className="m-6" />
  return (
    <>
      <EncabezadoEstrategia estrategia={e} d={d} />
      <TableScreenBody>
        <div className="flex flex-col gap-6 pb-6">
          <FichaEstrategia estrategia={e} />
          {e.efectividad && <EfectividadEstrategia efectividad={e.efectividad} />}
          <TablaBeneficiarios d={d} />
        </div>
      </TableScreenBody>
      {d.dialogos}
    </>
  )
}
