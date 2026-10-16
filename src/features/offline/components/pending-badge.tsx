import { Badge } from "@/components/ui/badge"
import { SpinnerIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePendingFor } from "@/lib/offline/outbox/hooks"
import type { OutboxStatus } from "@/lib/offline/outbox/types"

/** Badge por ítem (plan §7.3). */
const BADGE: Record<
  Exclude<OutboxStatus, "done">,
  { label: string; color: "info" | "warning" | "destructive" | "muted"; tooltip: string }
> = {
  pending: { label: "Pendiente", color: "info", tooltip: "Guardado en este equipo. Se enviará al recuperar la conexión." },
  retry: { label: "Pendiente", color: "info", tooltip: "Guardado en este equipo. Se enviará al recuperar la conexión." },
  inflight: { label: "Enviando…", color: "info", tooltip: "Enviando al servidor." },
  conflict: { label: "Conflicto", color: "warning", tooltip: "Otra persona cambió este dato. Resuélvelo en Cambios pendientes." },
  rejected: { label: "No guardado", color: "destructive", tooltip: "El servidor rechazó este cambio. Revísalo en Cambios pendientes." },
  blocked: { label: "En espera", color: "muted", tooltip: "Depende de otro cambio que no se pudo guardar." },
}

export function PendingStatusBadge({ status }: { status: OutboxStatus | null }) {
  if (!status || status === "done") return null
  const b = BADGE[status]
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant="soft" color={b.color} data-slot="pending-badge" data-status={status}>
            {status === "inflight" && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
            {b.label}
          </Badge>
        }
      />
      <TooltipContent>{b.tooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Badge del estado de la outbox para una entidad (`planilla:act-est:<pk>`…). */
export function PendingBadge({ entityKey }: { entityKey: string | null | undefined }) {
  const status = usePendingFor(entityKey)
  return <PendingStatusBadge status={status} />
}
