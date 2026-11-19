import { TableScreenBody } from "@/components/layout/table-screen"

import type { PlanDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { EncabezadoPlan } from "@/features/gestion-estudiantil/prevencion/components/plan/detalle/encabezado-plan"
import { ResumenOrigen } from "@/features/gestion-estudiantil/prevencion/components/plan/detalle/resumen-origen"
import { SeccionAceptacion } from "@/features/gestion-estudiantil/prevencion/components/plan/detalle/seccion-aceptacion"
import { SeccionAccionesPlan } from "@/features/gestion-estudiantil/prevencion/components/plan/detalle/seccion-acciones-plan"
import { SeccionAvances } from "@/features/gestion-estudiantil/prevencion/components/plan/detalle/seccion-avances"
import { usePlanDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-plan-detalle"

/** Contenido del detalle del plan: encabezado, resumen y las secciones de acciones, avances y aceptación. */
export function PlanDetalleContenido({ plan }: { plan: PlanDetalle }) {
  const d = usePlanDetalle(plan)
  return (
    <>
      <EncabezadoPlan plan={plan} d={d} />
      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ResumenOrigen plan={plan} analisisOrigen={d.analisisOrigen} canal={d.canal} onVerCaso={d.verCaso} />
          <SeccionAccionesPlan acciones={plan.acciones} onRegistrarAvance={d.registrarAvance} />
          <SeccionAvances avances={d.avances} puedeRegistrar={d.hayAvanzable} onRegistrar={() => d.registrarAvance()} />
          <SeccionAceptacion plan={plan} canal={d.canal} />
        </div>
      </TableScreenBody>
      {d.dialogos}
    </>
  )
}
