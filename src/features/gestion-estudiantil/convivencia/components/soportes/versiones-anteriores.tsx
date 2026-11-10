import type { SoporteAccion } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"

/** «Versiones anteriores (n)»: soportes sustituidos o retirados, con su motivo. */
export function VersionesAnteriores({ soportes }: { soportes: SoporteAccion[] }) {
  if (!soportes.length) return null
  return (
    <SeccionPlegable encuadrada defaultAbierta={false} titulo={`Versiones anteriores (${soportes.length})`} contentClassName="px-0 py-0">
      <ul className="flex flex-col divide-y divide-border">
        {soportes.map((s) => (
          <li key={s.id} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm">
            <span className="font-medium">{s.nombre}</span>
            <span className="text-xs text-muted-foreground">
              {[s.autor, formatFechaHora(s.fecha)].filter(Boolean).join(" · ")}
              {s.retirado_en && ` · Retirado el ${formatFechaHora(s.retirado_en)}${s.retirado_por ? ` por ${s.retirado_por}` : ""}`}
            </span>
            {s.motivo_retiro && <span className="text-xs text-muted-foreground">Motivo: {s.motivo_retiro}</span>}
          </li>
        ))}
      </ul>
    </SeccionPlegable>
  )
}
