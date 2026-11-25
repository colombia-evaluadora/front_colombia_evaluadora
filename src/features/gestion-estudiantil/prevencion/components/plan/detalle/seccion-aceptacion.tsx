import { FichaDatos } from "@/components/ficha-datos"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { PlanDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { SoporteAceptacion } from "@/features/gestion-estudiantil/prevencion/components/plan/detalle/soporte-aceptacion"

/** Aceptación del acudiente: canal, fecha y soporte firmado cuando fue presencial. */
export function SeccionAceptacion({ plan: p, canal }: { plan: PlanDetalle; canal: string | null }) {
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Aceptación del acudiente" contentClassName="px-4 py-4">
      {p.fecha_aceptacion ? (
        <div className="flex flex-col gap-3">
          <FichaDatos
            datos={[
              { etiqueta: "Canal", valor: canal },
              { etiqueta: "Fecha de aceptación", valor: formatFecha(p.fecha_aceptacion) },
            ]}
          />
          {p.fk_tarchivo_soporte != null && <SoporteAceptacion archivo={p.fk_tarchivo_soporte} />}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          El plan se activa cuando el acudiente lo acepta en el portal o con el soporte de la aceptación presencial.
        </p>
      )}
    </SeccionPlegable>
  )
}
