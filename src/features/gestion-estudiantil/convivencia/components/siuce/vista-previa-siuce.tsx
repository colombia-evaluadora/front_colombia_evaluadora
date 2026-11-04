import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import type { SiuceVistaPrevia } from "@/features/gestion-estudiantil/convivencia/api/comite-types"

interface Props {
  rangoOk: boolean
  isPending: boolean
  isError: boolean
  data: SiuceVistaPrevia | undefined
}

/** Cuántas filas, casos y pendientes traerá el reporte, y cuántos casos quedan fuera por fecha desconocida. */
export function VistaPreviaSiuce({ rangoOk, isPending, isError, data }: Props) {
  if (!rangoOk) return <p className="text-sm text-muted-foreground">Elija un rango de fechas para ver la previsualización.</p>
  if (isError) return <p className="text-sm text-red">No se pudo calcular la previsualización.</p>
  if (isPending || !data) return <Skeleton className="h-16" />
  const fuera = data.excluidos_fecha_desconocida
  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-3 gap-3 rounded-lg border border-border px-4 py-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Filas</dt>
          <dd className="font-medium">{data.filas}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Casos</dt>
          <dd className="font-medium">{data.casos}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Pendientes de reporte</dt>
          <dd className="font-medium">{data.pendientes}</dd>
        </div>
      </dl>
      {fuera > 0 && (
        <Alert variant="warning">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            {fuera} {fuera === 1 ? "caso queda fuera" : "casos quedan fuera"} del rango porque la fecha de los hechos es desconocida.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
