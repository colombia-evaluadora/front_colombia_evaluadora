import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { ESTADO_SESION_ICON, ESTADO_SESION_LABELS } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { EstadoSesion, ResumenHoras } from "@/features/academic-management/asistencia/api/types/asistencia"

interface AsistenciaSummaryCardsProps {
  resumen: ResumenHoras | undefined
}

const CARDS: { estado: EstadoSesion; key: keyof ResumenHoras; ring: string }[] = [
  { estado: "REGISTRADA", key: "registradas_mes", ring: "bg-green" },
  { estado: "RETRASADA", key: "retrasadas_mes", ring: "bg-red" },
  { estado: "PENDIENTE", key: "pendientes_mes", ring: "bg-blue" },
]

const numberFormatter = new Intl.NumberFormat("es-CO")

export function AsistenciaSummaryCards({ resumen }: AsistenciaSummaryCardsProps) {
  return (
    <section
      aria-label="Resumen de asistencia del mes"
      className="grid grid-cols-1 divide-y divide-border rounded-md border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0"
    >
      {CARDS.map(({ estado, key, ring }) => {
        const Icon = ESTADO_SESION_ICON[estado]
        const { title, description } = ESTADO_SESION_LABELS[estado]
        return (
          <div key={estado} className="flex items-center gap-2.5 p-3">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-white",
                ring,
              )}
              aria-hidden="true"
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{title}</p>
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            </div>
            {resumen ? (
              <span className="text-3xl font-bold tabular-nums">
                {numberFormatter.format(resumen[key])}
              </span>
            ) : (
              <Skeleton className="h-8 w-10" />
            )}
          </div>
        )
      })}
    </section>
  )
}
