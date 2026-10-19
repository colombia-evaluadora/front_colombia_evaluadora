import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

import type { FilaInforme } from "@/features/academic-management/reports/api/types"
import { etiquetaPeriodo } from "@/features/academic-management/reports/utils/agrupar-filas"
import {
  filaMarcable,
  marcaKey,
  type MarcasPeriodo,
} from "@/features/academic-management/reports/utils/periodos-marcados"

interface EtiquetaPeriodoMarcableProps {
  fila: FilaInforme
  /** Clases de la sub-fila: cada tabla tiene su propio alto. */
  className?: string
  /** Estudiante seleccionado y varios períodos a la vista. */
  marcable: boolean
  marcas: MarcasPeriodo
  onToggleMarca: (matriculaId: number, periodoId: number) => void
}

/** La etiqueta de la columna "Pe" ("P1") con, si corresponde, el check que
 *  dice que la acción (boletín o guardar) aplica a ese período del estudiante.
 *  El Final y las filas "requerido" nunca llevan check. */
export function EtiquetaPeriodoMarcable({
  fila,
  className,
  marcable,
  marcas,
  onToggleMarca,
}: EtiquetaPeriodoMarcableProps) {
  const conCheck = marcable && filaMarcable(fila)
  return (
    <span
      className={cn("flex items-center justify-center gap-1.5", className)}
      title={fila.periodoNombre}
    >
      {conCheck && (
        <Checkbox
          aria-label={`Usar ${fila.periodoNombre} de ${fila.nombreCompleto}`}
          checked={marcas.has(marcaKey(fila.matriculaId, fila.periodoId))}
          onCheckedChange={() => onToggleMarca(fila.matriculaId, fila.periodoId)}
        />
      )}
      {etiquetaPeriodo(fila)}
    </span>
  )
}
