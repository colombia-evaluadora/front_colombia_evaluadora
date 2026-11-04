import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowsLeftRightIcon, EyeIcon, TrashIcon } from "@/components/ui/icons"

import type { SoporteAccion } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { formatFechaHora } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { formatPeso } from "@/features/gestion-estudiantil/convivencia/utils/soportes"

interface Props {
  soporte: SoporteAccion
  soloLectura: boolean
  onVer: () => void
  onSustituir: () => void
  onRetirar: () => void
}

/** Un soporte vigente: nombre, tipo, tamaño, autor y fecha, origen y acciones. */
export function FilaSoporte({ soporte: s, soloLectura, onVer, onSustituir, onRetirar }: Props) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{s.nombre}</span>
        <span className="text-xs text-muted-foreground">
          {[s.tipo, formatPeso(s.peso), [s.autor, formatFechaHora(s.fecha)].filter(Boolean).join(" · ")].filter(Boolean).join(" · ")}
        </span>
      </div>
      <Badge variant="soft" color={s.vinculado ? "info" : "success"}>
        {s.vinculado ? "Vinculado del caso" : "Cargado"}
      </Badge>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Ver ${s.nombre}`} onClick={onVer}>
          <EyeIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label={`Sustituir ${s.nombre}`}
          disabled={soloLectura}
          onClick={onSustituir}
        >
          <ArrowsLeftRightIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label={s.vinculado ? `Quitar la referencia a ${s.nombre}` : `Retirar ${s.nombre}`}
          disabled={soloLectura}
          onClick={onRetirar}
        >
          <TrashIcon />
        </Button>
      </div>
    </li>
  )
}
