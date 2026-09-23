import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts"

import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { CalendarBlankIcon, CheckCircleFillIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import type { ResumenHoras } from "@/features/academic-management/asistencia/api/types/asistencia"

interface AsistenciaRegistroMensualCardProps {
  resumen: ResumenHoras | undefined
}

const numberFormatter = new Intl.NumberFormat("es-CO")
const percentFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 })

const gaugeChartConfig = {
  registro: { label: "Registradas", color: "var(--green)" },
} satisfies ChartConfig

const DESGLOSE = [
  { key: "registradas_mes" as const, label: "Completadas", color: "var(--green)" },
  { key: "retrasadas_mes" as const, label: "Vencidas (sin registrar)", color: "var(--red)" },
  { key: "pendientes_mes" as const, label: "Futuras/Pendientes", color: "var(--blue)" },
]


function franjaSemanaActual(): number {
  const diaSemana = new Date().getDay() // 0=domingo … 6=sábado
  if (diaSemana === 0) return 0
  if (diaSemana === 6) return 1
  return diaSemana / 5
}

/** "Registro mensual: al día" — % de clases registradas del mes, desglose por estado y avance de la semana. */
export function AsistenciaRegistroMensualCard({ resumen }: AsistenciaRegistroMensualCardProps) {
  const total = resumen
    ? resumen.registradas_mes + resumen.retrasadas_mes + resumen.pendientes_mes
    : 0
  const pct = total > 0 ? (resumen!.registradas_mes / total) * 100 : 0
  const gaugeData = [{ value: pct, fill: "var(--green)" }]
  const maxDesglose = resumen
    ? Math.max(resumen.registradas_mes, resumen.retrasadas_mes, resumen.pendientes_mes, 1)
    : 1

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-22 text-green">
          <CheckCircleFillIcon className="size-3.5" aria-hidden="true" />
        </span>
        Registro mensual: al día
      </h3>

      <div className="flex flex-col items-center gap-1">
        {!resumen ? (
          <Skeleton className="size-32 rounded-full" />
        ) : (
          <div className="relative flex size-32 items-center justify-center">
            <ChartContainer config={gaugeChartConfig} className="aspect-square size-32">
              <RadialBarChart
                data={gaugeData}
                innerRadius="72%"
                outerRadius="100%"
                startAngle={225}
                endAngle={-45}
                barSize={14}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} cornerRadius={999} />
              </RadialBarChart>
            </ChartContainer>
            <span className="pointer-events-none absolute text-3xl font-bold tabular-nums">
              {percentFormatter.format(pct)}%
            </span>
          </div>
        )}
        <div className="-mt-4 text-xs text-muted-foreground">
          {resumen ? (
            `${numberFormatter.format(resumen.registradas_mes)} clases registradas de ${numberFormatter.format(total)}`
          ) : (
            <Skeleton className="h-4 w-40" />
          )}
        </div>
      </div>

      {!resumen ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <div className="flex items-stretch gap-3">
          <div className="flex shrink-0 items-end gap-1.5">
            {DESGLOSE.map(({ key, color }) => (
              <div
                key={key}
                className="w-3 rounded-sm"
                style={{
                  height: `${Math.max(8, (resumen[key] / maxDesglose) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            ))}
          </div>
          <ul className="flex min-w-0 flex-1 flex-col gap-2">
            {DESGLOSE.map(({ key, label, color }) => (
              <li key={key} className="flex items-stretch gap-2">
                <span
                  className="w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-bold tabular-nums text-foreground">
                    {numberFormatter.format(resumen[key])} clases
                  </span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">
                    {label}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarBlankIcon className="size-3.5" aria-hidden="true" />
          Semana actual (Lun-Vie)
        </h4>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full bg-green")}
            style={{ width: `${franjaSemanaActual() * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
