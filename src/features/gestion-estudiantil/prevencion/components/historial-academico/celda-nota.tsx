import type { HistorialAcademicoNotaPeriodo } from "@/features/gestion-estudiantil/prevencion/api/types"
import { formatNota, textoNota } from "@/features/gestion-estudiantil/prevencion/utils/historial-academico"

/** Nota de un período con su recuperación («3,5 Recuperación · Nota original 2,8») y su valoración. */
export function CeldaNota({ p }: { p: HistorialAcademicoNotaPeriodo | undefined }) {
  if (!p || p.sin_registro) return <span className="text-muted-foreground">Sin registro</span>
  return (
    <div className="flex flex-col">
      <span>
        {textoNota(p)}
        {!p.definitiva && <span className="text-muted-foreground"> (provisional)</span>}
        {p.con_recuperacion && <span className="text-muted-foreground"> Recuperación</span>}
      </span>
      {p.con_recuperacion && p.nota_original != null && (
        <span className="text-xs text-muted-foreground">Nota original {formatNota(p.nota_original)}</span>
      )}
      {p.valoracion && <span className="text-xs text-muted-foreground">{p.valoracion}</span>}
    </div>
  )
}

