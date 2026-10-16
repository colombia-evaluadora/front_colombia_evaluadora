import { cn } from "@/lib/utils"
import type { EtiquetaForo } from "@/features/comunicaciones/foros/api/types"
import { CLASE_ETIQUETA } from "@/features/comunicaciones/foros/lib/foros"

// Etiqueta de una publicación (color de la paleta semántica, legible en ambos temas).
export function EtiquetaChip({ etiqueta, className }: { etiqueta: EtiquetaForo; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-40 items-center rounded-full border px-2.5 text-xs font-medium",
        CLASE_ETIQUETA[etiqueta.color] ?? CLASE_ETIQUETA.BLUE,
        className,
      )}
      title={etiqueta.soloModeradores ? `${etiqueta.nombre} (solo moderación)` : etiqueta.nombre}
    >
      <span className="truncate">{etiqueta.nombre}</span>
    </span>
  )
}

// Selector de etiquetas como chips conmutables (crear publicación, mover etiquetas, filtrar).
export function SelectorEtiquetas({
  etiquetas,
  value,
  onChange,
  max,
  disabled,
  etiqueta = "Etiquetas",
}: {
  etiquetas: readonly EtiquetaForo[]
  value: readonly number[]
  onChange: (ids: number[]) => void
  max?: number
  disabled?: boolean
  etiqueta?: string
}) {
  if (etiquetas.length === 0) {
    return <p className="text-sm text-muted-foreground">Este foro todavía no tiene etiquetas.</p>
  }
  return (
    <ul role="group" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {etiquetas.map((e) => {
        const activa = value.includes(e.id)
        const lleno = max != null && !activa && value.length >= max
        return (
          <li key={e.id}>
            <button
              type="button"
              aria-pressed={activa}
              disabled={disabled || lleno}
              onClick={() => onChange(activa ? value.filter((x) => x !== e.id) : [...value, e.id])}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50",
                activa ? CLASE_ETIQUETA[e.color] : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {e.nombre}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
