import { TableScreenBody } from "@/components/layout/table-screen"

import type { ValoracionDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { EncabezadoValoracion } from "@/features/gestion-estudiantil/prevencion/components/valoracion/detalle/encabezado-valoracion"
import { SeccionValoracion } from "@/features/gestion-estudiantil/prevencion/components/valoracion/detalle/seccion-valoracion"
import { useValoracionDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-valoracion-detalle"

/** Contenido del detalle de una valoración. */
export function ValoracionDetalleContenido({ valoracion }: { valoracion: ValoracionDetalle }) {
  const d = useValoracionDetalle(valoracion)
  return (
    <>
      <EncabezadoValoracion valoracion={valoracion} d={d} />
      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <SeccionValoracion valoracion={valoracion} />
        </div>
      </TableScreenBody>
      {d.dialogos}
    </>
  )
}
