import { CalendarIcon, LightningIcon, UsersIcon, type Icon } from "@phosphor-icons/react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { useAuditsStatsQuery } from "../../api/query/use-audits-stats-query"
import type { AuditsQueryRequest } from "../../api/types/audit"

interface AuditSessionStatsCardsProps {
  selectedIds: string[]
  hasSelection: boolean
  filters: AuditsQueryRequest["filters"]
}

const numberFormatter = new Intl.NumberFormat("es-CO")

interface StatTile {
  icon: Icon
  value: number | undefined
  label: string
  iconClassName: string
}

export function AuditSessionStatsCards({
  selectedIds,
  hasSelection,
  filters,
}: AuditSessionStatsCardsProps) {
  // Igual que exportar: con selección se calcula sobre lo seleccionado, sin
  // selección se calcula sobre lo que coincide con los filtros activos.
  const { data } = useAuditsStatsQuery(
    hasSelection ? { ids: selectedIds } : { filters }
  )

  const tiles: StatTile[] = [
    {
      icon: CalendarIcon,
      value: data?.sessionsToday,
      label: "Sesiones",
      iconClassName: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      icon: UsersIcon,
      value: data?.activeSessions,
      label: "Sesiones activas",
      iconClassName: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      icon: LightningIcon,
      value: data?.operationsToday,
      label: "Operaciones",
      iconClassName: "bg-primary/10 text-primary",
    },
  ]

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label} size="sm">
          <CardContent className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                tile.iconClassName
              )}
            >
              <tile.icon weight="fill" className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">
                {tile.value != null ? numberFormatter.format(tile.value) : "—"}
              </span>
              <span className="text-sm text-muted-foreground">{tile.label}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
