import { Badge } from "@/components/ui/badge"

import type { ResumenGestion } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADO_GESTION_COLOR, UMBRAL_GESTION_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/** Línea bajo el título de los modales (G.8.GAL.3): estudiante · grupo, umbral y estado. */
export function ResumenGestionDialogo({ g }: { g: ResumenGestion }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {g.estudiante_nombre} · {g.grado_grupo}
      <Badge variant="soft" color={UMBRAL_GESTION_COLOR[g.umbral]}>
        <span>Umbral: {g.umbral_nombre}</span>
      </Badge>
      <Badge variant="soft" color={ESTADO_GESTION_COLOR[g.estado]}>
        <span>{g.estado_nombre}</span>
      </Badge>
    </span>
  )
}
