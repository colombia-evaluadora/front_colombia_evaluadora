import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { ResumenAcomp } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/badges-acompanamiento"

/** Línea bajo el título de los modales: situación o sustancia, estado y fecha de apertura. */
export function ResumenAcompDialogo({ a }: { a: ResumenAcomp }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {a.detalle_nombre ?? (a.tipo === "EMBARAZO" ? "Embarazo y maternidad/paternidad" : "Consumo de sustancias")} ·
      <BadgeEstadoAcomp estado={a.estado} nombre={a.estado_nombre} />· abierto el {formatFecha(a.fecha_conocimiento)}
    </span>
  )
}
