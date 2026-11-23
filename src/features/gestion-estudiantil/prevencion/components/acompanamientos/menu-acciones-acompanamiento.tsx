import { EyeIcon, LinkIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { AcompanamientoRow, ReporteConsumoRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  accionesAcomp,
  type AccionAcomp,
  type AccionReporteConsumo,
} from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/acciones-acompanamiento"

export function MenuAccionesAcomp({ fila, onAccion }: { fila: AcompanamientoRow; onAccion: (accion: AccionAcomp) => void }) {
  return (
    <AccionesFila etiqueta={`Acciones del acompañamiento de ${fila.estudiante_nombre}`} acciones={accionesAcomp(fila, onAccion)} />
  )
}

/** Vincular va deshabilitado en un reporte ya Atendido (el backend tampoco lo permite). */
export function MenuAccionesReporteConsumo({
  fila,
  onAccion,
}: {
  fila: ReporteConsumoRow
  onAccion: (accion: AccionReporteConsumo) => void
}) {
  return (
    <AccionesFila
      etiqueta={`Acciones del reporte de ${fila.estudiante_nombre}`}
      acciones={[
        { id: "ver", label: "Ver reporte", icon: <EyeIcon />, onSelect: () => onAccion("ver") },
        {
          id: "vincular",
          label: "Vincular reporte",
          icon: <LinkIcon />,
          disabled: fila.estado === "ATENDIDO",
          onSelect: () => onAccion("vincular"),
        },
      ]}
    />
  )
}
