import { CheckCircleFillIcon, UsersIcon, XCircleIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface SeguimientoSummaryCardsProps {
  totalEstudiantes: number | undefined
  ausentes: number | undefined
}

const numberFormatter = new Intl.NumberFormat("es-CO")
const percentFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 })

/** Las 3 tarjetas del encabezado de "Seguimiento": Total / Asistieron / Ausentes. */
export function SeguimientoSummaryCards({ totalEstudiantes, ausentes }: SeguimientoSummaryCardsProps) {
  const loaded = totalEstudiantes != null && ausentes != null
  const asistieron = loaded ? totalEstudiantes - ausentes : 0
  const pctAsistieron = loaded && totalEstudiantes > 0 ? (asistieron / totalEstudiantes) * 100 : 0
  const pctAusentes = loaded && totalEstudiantes > 0 ? (ausentes / totalEstudiantes) * 100 : 0

  const cards = [
    {
      key: "total",
      icon: UsersIcon,
      iconBg: "bg-primary",
      cardBg: "bg-primary-22",
      label: "Total estudiantes",
      value: loaded ? numberFormatter.format(totalEstudiantes) : null,
      description: null,
    },
    {
      key: "asistieron",
      icon: CheckCircleFillIcon,
      iconBg: "bg-green",
      cardBg: "bg-green-22",
      label: "Asistieron",
      value: loaded ? numberFormatter.format(asistieron) : null,
      description: loaded ? `${percentFormatter.format(pctAsistieron)}% del grupo` : null,
    },
    {
      key: "ausentes",
      icon: XCircleIcon,
      iconBg: "bg-orange",
      cardBg: "bg-orange-22",
      label: "Ausentes",
      value: loaded ? numberFormatter.format(ausentes) : null,
      description: loaded ? `${percentFormatter.format(pctAusentes)}% del grupo` : null,
    },
  ] as const

  return (
    <section aria-label="Resumen de seguimiento" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map(({ key, icon: Icon, iconBg, cardBg, label, value, description }) => (
        <div key={key} className={cn("flex items-center gap-3 rounded-md p-3", cardBg)}>
          <span
            className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-white", iconBg)}
            aria-hidden="true"
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <p className="text-sm text-foreground">{label}</p>
              {value !== null ? (
                <span className="text-lg font-bold tabular-nums">{value}</span>
              ) : (
                <Skeleton className="h-6 w-8" />
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
      ))}
    </section>
  )
}
