import { ClockIcon, InfoIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import type { ResumenHoras } from "@/features/academic-management/asistencia/api/types/asistencia"

interface AsistenciaHoursCardsProps {
  resumen: ResumenHoras | undefined
}

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 })

export function AsistenciaHoursCards({ resumen }: AsistenciaHoursCardsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-22 text-red">
          <ClockIcon className="size-3.5" aria-hidden="true" />
        </span>
        Horas programadas
      </h3>

      <div className="flex flex-col items-center gap-0.5 py-1">
        {!resumen ? (
          <Skeleton className="h-10 w-24" />
        ) : (
          <span className="text-4xl font-bold tabular-nums">
            {numberFormatter.format(resumen.horas_mes)}h
          </span>
        )}
        <span className="text-sm text-muted-foreground">Este mes</span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {(
          [
            ["Esta semana", resumen?.horas_semana],
            ["Este mes", resumen?.horas_mes],
            ["Este año", resumen?.horas_anio],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dd className="text-base font-semibold tabular-nums">
              {value !== undefined ? `${numberFormatter.format(value)}h` : <Skeleton className="mx-auto h-5 w-10" />}
            </dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      <p className="flex items-center gap-1.5 rounded-md border border-blue-stroke bg-blue-22 p-2 text-[11px] text-foreground">
        <InfoIcon className="size-5 shrink-0 text-blue" aria-hidden="true" />
        <span>
          <span className="font-semibold">Horas programadas:</span> tiempo de clases registrado en el
          calendario.
        </span>
      </p>
    </div>
  )
}
