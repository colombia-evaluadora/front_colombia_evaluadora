import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CaracterizacionDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"

/** Historial de la revisión: factores que dejaron de aplicar (con motivo y fecha) y revisiones registradas. Nada se borra. */
export function HistorialFactores({ e }: { e: CaracterizacionDetalle["establecimiento"] }) {
  const cerrados = e.factores.filter((f) => f.estado === "DESACTIVADO")
  if (cerrados.length === 0 && e.historial_revisiones.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Historial</h3>
      <ul className="flex flex-col gap-1 text-sm">
        {e.historial_revisiones.map((r, n) => (
          <li key={`rev-${n}`}>
            <span className="text-muted-foreground">{formatFecha(r.fecha)} · </span>
            Revisión: {r.revision?.nombre ?? "—"} ({r.factores_vigentes} {r.factores_vigentes === 1 ? "factor vigente" : "factores vigentes"})
            {r.funcionario ? ` · ${r.funcionario}` : ""}
          </li>
        ))}
        {cerrados.map((f, n) => (
          <li key={`fac-${n}`}>
            <span className="text-muted-foreground">{formatFecha(f.fecha_fin)} · </span>
            {f.factor.nombre} dejó de aplicar{f.motivo_fin ? `: ${f.motivo_fin}` : ""}
          </li>
        ))}
      </ul>
    </div>
  )
}
