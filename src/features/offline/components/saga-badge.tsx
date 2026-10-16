import { Badge } from "@/components/ui/badge"
import { SpinnerIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useOutboxOps } from "@/lib/offline/outbox/hooks"
import { sagaStatusFor, type SagaStatus } from "@/lib/offline/outbox/saga"

/** Badge de una actividad/unidad con un guardado multi-paso abierto (Fase 3, §7.3). */
const BADGE: Record<
  Exclude<SagaStatus, "done">,
  { label: string; color: "info" | "warning" | "destructive"; tooltip: string }
> = {
  pending: { label: "Pendiente", color: "info", tooltip: "Guardado en este equipo. Se enviará paso a paso al recuperar la conexión." },
  syncing: { label: "Sincronizando…", color: "info", tooltip: "Enviando los pasos del guardado al servidor." },
  partial: {
    label: "Guardado parcial",
    color: "destructive",
    tooltip: "Algunos pasos se guardaron y otro fue rechazado. Revísalo en Cambios pendientes.",
  },
  rejected: { label: "No guardado", color: "destructive", tooltip: "El servidor rechazó este guardado. Revísalo en Cambios pendientes." },
  conflict: {
    label: "Conflicto",
    color: "warning",
    tooltip: "Cambió en el servidor mientras estabas sin conexión. Resuélvelo en Cambios pendientes.",
  },
}

export function SagaStatusBadge({ status }: { status: SagaStatus | null }) {
  if (!status || status === "done") return null
  const b = BADGE[status]
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant="soft" color={b.color} data-slot="saga-badge" data-status={status}>
            {status === "syncing" && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
            {b.label}
          </Badge>
        }
      />
      <TooltipContent>{b.tooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Estado del guardado abierto sobre `target` (`actividad:12`, `unidad:3`). */
export function useSagaStatus(target: string | null | undefined): SagaStatus | null {
  const ops = useOutboxOps()
  return target ? sagaStatusFor(ops, target) : null
}

export function SagaBadge({ target }: { target: string | null | undefined }) {
  return <SagaStatusBadge status={useSagaStatus(target)} />
}
