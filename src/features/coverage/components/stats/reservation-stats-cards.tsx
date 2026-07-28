import { Bar, BarChart, Cell, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts"

import { WarningIcon } from "@/components/ui/icons"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import {
  EDUCATION_LEVEL_SHORT_LABELS,
  RESERVATION_STATUS_LABELS,
  SHIFT_LABELS,
} from "../../api/ui-mappings"
import { useReservationsStatsQuery } from "../../api/query/use-reservations-stats-query"
import type { ReservationsQueryFilters } from "../../api/types/reservation"

interface ReservationStatsCardsProps {
  selectedIds: string[]
  hasSelection: boolean
  filters: ReservationsQueryFilters
}

const numberFormatter = new Intl.NumberFormat("es-CO")
const percentFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 })

// Distribuciones: paleta neutra del design system (`--chart-*`), ya calibrada
// para light y dark.
const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

// Cobertura: acá el color sí significa algo (mismo criterio que los badges de
// estado de la tabla), así que van los tokens semánticos.
const COVERAGE_SERIES = [
  { key: "confirmed", label: RESERVATION_STATUS_LABELS.confirmada, color: "var(--green)" },
  { key: "pending", label: RESERVATION_STATUS_LABELS.pendiente, color: "var(--yellow)" },
  { key: "expired", label: RESERVATION_STATUS_LABELS.vencida, color: "var(--red)" },
  { key: "free", label: "Cupos libres", color: "var(--muted)" },
] as const

const coverageChartConfig = Object.fromEntries(
  COVERAGE_SERIES.map((serie) => [serie.key, { label: serie.label, color: serie.color }]),
) satisfies ChartConfig

/**
 * Franja de indicadores sobre la tabla. Va sin `Card`: tres bloques separados
 * por divisores dentro de un solo borde, para que en mobile se apilen sin
 * gastar una pantalla entera en padding y encabezados.
 */
export function ReservationStatsCards({
  selectedIds,
  hasSelection,
  filters,
}: ReservationStatsCardsProps) {
  // Igual que exportar: con selección se calcula sobre lo seleccionado, sin
  // selección sobre lo que coincide con los filtros activos.
  const { data } = useReservationsStatsQuery(hasSelection ? { ids: selectedIds } : { filters })

  const total = data?.total ?? 0
  const coverageRate = data && data.offeredSeats > 0 ? data.confirmed / data.offeredSeats : 0
  const gapRate = Math.max(0, 1 - coverageRate)

  // Una sola fila apilada: confirmadas + pendientes + vencidas + lo que queda
  // libre de la oferta. Se lee de corrido cuánto de la oferta está tomado.
  const coverageRow = data
    ? {
        confirmed: data.confirmed,
        pending: data.pending,
        expired: data.expired,
        free: Math.max(0, data.offeredSeats - data.total),
      }
    : null

  const levelData =
    data?.byLevel.map((item, index) => ({
      key: item.key,
      count: item.count,
      fill: SERIES_COLORS[index % SERIES_COLORS.length],
    })) ?? []

  const shiftData =
    data?.byShift.map((item, index) => ({
      key: item.key,
      count: item.count,
      fill: SERIES_COLORS[index % SERIES_COLORS.length],
    })) ?? []

  const levelChartConfig: ChartConfig = Object.fromEntries(
    levelData.map((item) => [
      item.key,
      { label: EDUCATION_LEVEL_SHORT_LABELS[item.key], color: item.fill },
    ]),
  )
  const shiftChartConfig: ChartConfig = Object.fromEntries(
    shiftData.map((item) => [item.key, { label: SHIFT_LABELS[item.key], color: item.fill }]),
  )

  return (
    <section
      aria-label="Indicadores de reservas"
      className="mb-4 grid grid-cols-1 divide-y divide-border rounded-md border border-border lg:grid-cols-3 lg:divide-x lg:divide-y-0"
    >
      {/* 1. Cobertura de la oferta — barra apilada: compara lo reservado
          contra los cupos disponibles en una sola línea. */}
      <div className="flex flex-col gap-2 p-3">
        <h3 className="text-xs font-medium text-muted-foreground">Cobertura de la oferta</h3>
        {!data || !coverageRow ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {percentFormatter.format(coverageRate * 100)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {numberFormatter.format(data.confirmed)} de{" "}
                {numberFormatter.format(data.offeredSeats)} cupos
              </span>
            </div>

            <ChartContainer config={coverageChartConfig} className="aspect-auto h-6 w-full">
              <BarChart
                layout="vertical"
                data={[coverageRow]}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                barCategoryGap={0}
              >
                <XAxis type="number" domain={[0, data.offeredSeats || 1]} hide />
                <YAxis type="category" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                {COVERAGE_SERIES.map((serie, index) => (
                  <Bar
                    key={serie.key}
                    dataKey={serie.key}
                    stackId="coverage"
                    fill={`var(--color-${serie.key})`}
                    radius={
                      index === 0
                        ? [4, 0, 0, 4]
                        : index === COVERAGE_SERIES.length - 1
                          ? [0, 4, 4, 0]
                          : 0
                    }
                  />
                ))}
              </BarChart>
            </ChartContainer>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              {COVERAGE_SERIES.map((serie) => (
                <div key={serie.key} className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: serie.color }}
                    aria-hidden="true"
                  />
                  <dt className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {serie.label}
                  </dt>
                  <dd className="text-xs font-semibold tabular-nums">
                    {numberFormatter.format(coverageRow[serie.key])}
                  </dd>
                </div>
              ))}
            </dl>

            {gapRate > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <WarningIcon className="size-3.5 shrink-0 text-orange" />
                {percentFormatter.format(gapRate * 100)}% de la oferta sin confirmar
              </p>
            )}
          </>
        )}
      </div>

      {/* 2. Nivel educativo — barras horizontales: categorías con nombre y con
          un orden natural (preescolar → media) que la barra respeta. */}
      <div className="flex flex-col gap-2 p-3">
        <h3 className="text-xs font-medium text-muted-foreground">
          Por nivel educativo · {numberFormatter.format(total)} reservas
        </h3>
        {!data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ChartContainer config={levelChartConfig} className="aspect-auto h-28 w-full">
            <BarChart
              data={levelData}
              layout="vertical"
              margin={{ top: 0, right: 96, bottom: 0, left: 0 }}
              barSize={14}
            >
              <XAxis type="number" dataKey="count" hide />
              <YAxis
                type="category"
                dataKey="key"
                tickLine={false}
                axisLine={false}
                width={70}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: string) =>
                  EDUCATION_LEVEL_SHORT_LABELS[value as keyof typeof EDUCATION_LEVEL_SHORT_LABELS]
                }
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="key" />} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {levelData.map((item) => (
                  <Cell key={item.key} fill={item.fill} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={6}
                  className="fill-foreground text-[11px] font-medium"
                  formatter={(value) => {
                    const count = Number(value ?? 0)
                    const share = total > 0 ? Math.round((count / total) * 100) : 0
                    return `${numberFormatter.format(count)} · ${share}%`
                  }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>

      {/* 3. Jornada — dona: acá sí interesa la composición del total (las
          jornadas son partes excluyentes de las mismas reservas). */}
      <div className="flex flex-col gap-2 p-3">
        <h3 className="text-xs font-medium text-muted-foreground">Por jornada</h3>
        {!data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="flex items-center gap-3">
            <ChartContainer config={shiftChartConfig} className="aspect-square h-24 w-24 shrink-0">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent nameKey="key" hideLabel />}
                />
                <Pie
                  data={shiftData}
                  dataKey="count"
                  nameKey="key"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={2}
                  strokeWidth={0}
                />
              </PieChart>
            </ChartContainer>

            <ul className="flex min-w-0 flex-1 flex-col gap-1">
              {shiftData.map((item) => {
                const share = total > 0 ? Math.round((item.count / total) * 100) : 0
                return (
                  <li key={item.key} className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.fill }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {SHIFT_LABELS[item.key]}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        item.count === 0 && "text-muted-foreground",
                      )}
                    >
                      {numberFormatter.format(item.count)} · {share}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
