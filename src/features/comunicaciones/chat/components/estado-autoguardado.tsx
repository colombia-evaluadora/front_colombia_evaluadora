import { Button } from "@/components/ui/button"
import { CheckIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { EstadoAutoguardado } from "@/features/comunicaciones/chat/api/mutations/use-borrador-actividad"

const TEXTO: Record<EstadoAutoguardado, string | null> = {
  inactivo: null,
  pendiente: null,
  guardando: "Guardando borrador…",
  guardado: "Borrador guardado",
  error: "No se pudo guardar el borrador",
}

/** Estado discreto del autoguardado junto a los botones del diálogo. */
export function EstadoAutoguardado({
  estado,
  className,
}: {
  estado: EstadoAutoguardado
  className?: string
}) {
  const texto = TEXTO[estado]
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        estado === "error" && "text-red",
        className,
      )}
    >
      {estado === "guardado" && <CheckIcon aria-hidden className="size-3.5" />}
      {texto}
    </span>
  )
}

/**
 * Pie del diálogo de una actividad nueva: estado del autoguardado y, si ya hay borrador,
 * "Descartar borrador" (lo elimina de "Borradores y enviados").
 */
export function BarraBorrador({
  estado,
  hayBorrador,
  onDescartar,
  deshabilitado,
}: {
  estado: EstadoAutoguardado
  hayBorrador: boolean
  onDescartar: () => void
  deshabilitado?: boolean
}) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <EstadoAutoguardado estado={estado} />
      {hayBorrador && (
        <Button
          type="button"
          variant="link"
          color="neutral"
          size="xs"
          onClick={onDescartar}
          disabled={deshabilitado}
        >
          Descartar borrador
        </Button>
      )}
    </div>
  )
}
