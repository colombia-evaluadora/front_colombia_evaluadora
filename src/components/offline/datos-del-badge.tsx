import { Badge } from "@/components/ui/badge"
import { formatDatosDel, isDatoVencido } from "@/lib/offline/freshness"
import { useConnectivity } from "@/lib/offline/use-connectivity"

interface DatosDelBadgeProps {
  /** `dataUpdatedAt` de la query (0 = sin datos). */
  updatedAt: number
  /** TTL de la query (`TTL_OFFLINE.*`); vencido → badge rojo. */
  ttl?: number
  className?: string
}

/**
 * Rótulo de antigüedad de los datos en pantallas legibles sin conexión (tarea
 * 4.2). Solo aparece fuera de `online`: con red los datos son los del servidor.
 */
export function DatosDelBadge({ updatedAt, ttl, className }: DatosDelBadgeProps) {
  const { status } = useConnectivity()
  if (status === "online" || !updatedAt) return null
  const vencido = ttl !== undefined && isDatoVencido(updatedAt, ttl)
  return (
    <Badge variant="soft" color={vencido ? "destructive" : "info"} className={className}>
      {formatDatosDel(updatedAt)}
    </Badge>
  )
}
