import { Badge } from "@/components/ui/badge"
import type { EstadoEspacio } from "@/features/comunicaciones/espacios/api/types"

const ESTADO: Record<EstadoEspacio, { label: string; color: "success" | "muted" | "info" }> = {
  ABIERTO: { label: "Abierto", color: "success" },
  SOLO_LECTURA: { label: "Solo lectura", color: "muted" },
  POR_ABRIR: { label: "Por abrir", color: "info" },
}

export function BadgeEstadoEspacio({ estado }: { estado: EstadoEspacio }) {
  const e = ESTADO[estado]
  return (
    <Badge variant="soft" color={e.color}>
      {e.label}
    </Badge>
  )
}

/** `yyyy-MM-dd` a `dd/MM/yyyy` sin pasar por zona horaria. */
export function fechaDia(valor: string | null) {
  if (!valor) return "Sin fecha"
  const [a, m, d] = valor.split("-")
  return `${d}/${m}/${a}`
}
