import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { CloudAlertIcon, CloudCheckIcon, CloudOffIcon, CloudSyncIcon } from "@/components/ui/icons"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { paths } from "@/config/paths"
import { isOutboxEnabled, syncNow } from "@/lib/offline/outbox/engine"
import { useOutboxSummary } from "@/lib/offline/outbox/hooks"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import { cn } from "@/lib/utils"

/**
 * Indicador de sincronización del header (plan §7.2): nube + contador y un
 * popover con el resumen. Solo aparece si la outbox está habilitada o tiene
 * algo (piloto en equipo personal).
 */
export function HeaderSyncIndicator() {
  const summary = useOutboxSummary()
  const { status } = useConnectivity()
  if (!isOutboxEnabled() && summary.total === 0) return null

  const problemas = summary.rejected + summary.blocked + summary.conflict
  const offline = status === "offline"
  const Icon = problemas > 0 ? CloudAlertIcon : summary.syncing ? CloudSyncIcon : offline ? CloudOffIcon : CloudCheckIcon
  const tooltip =
    problemas > 0
      ? `${problemas} cambios con problemas`
      : summary.syncing
        ? `Sincronizando ${summary.total} cambios…`
        : offline
          ? `Sin conexión. ${summary.total} cambios esperando.`
          : summary.total > 0
            ? `${summary.total} cambios esperando.`
            : "Conectado. Todo sincronizado."

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="sm"
            aria-label={tooltip}
            title={tooltip}
            data-slot="sync-indicator"
            className={cn(problemas > 0 && "text-red")}
          />
        }
      >
        <Icon className={cn("size-5", summary.syncing && "animate-pulse")} />
        {summary.total > 0 && <span className="text-xs font-semibold tabular-nums">{summary.total}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>Cambios sin conexión</PopoverTitle>
        </PopoverHeader>
        <p className="text-sm">{tooltip}</p>
        <ul className="text-muted-foreground space-y-0.5 text-xs">
          <li>Pendientes: {summary.pending + summary.inflight}</li>
          <li>Conflictos: {summary.conflict}</li>
          <li>No guardados: {summary.rejected + summary.blocked}</li>
        </ul>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            color="neutral"
            size="sm"
            disabled={offline || summary.syncing || summary.total === 0}
            onClick={() => void syncNow()}
          >
            {offline ? "Sin conexión" : "Sincronizar ahora"}
          </Button>
          <Button
            variant="fill"
            color="primary"
            size="sm"
            nativeButton={false}
            render={<Link to={paths.app.pendientes.getHref()} />}
          >
            Ver todos los pendientes
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
