import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts"

import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

const gaugeChartConfig = {
  registro: { label: "Registradas", color: "var(--green)" },
} satisfies ChartConfig

export function AsistenciaRegistroGauge({ pct }: { pct: number }) {
  const gaugeData = [{ value: pct, fill: "var(--green)" }]
  return (
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
  )
}
