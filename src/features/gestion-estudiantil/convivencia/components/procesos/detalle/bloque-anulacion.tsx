import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ProhibitIcon } from "@/components/ui/icons"

import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"

/** Anulación del proceso: fecha, quién y el motivo (Regla 3). */
export function BloqueAnulacion({ anulacion }: { anulacion: NonNullable<ProcesoDetalle["anulacion"]> }) {
  return (
    <Alert variant="destructive">
      <ProhibitIcon aria-hidden="true" />
      <AlertTitle>
        Proceso anulado el {formatFecha(anulacion.fecha)} por {anulacion.por}
      </AlertTitle>
      <AlertDescription>
        <span className="whitespace-pre-wrap">Motivo: {anulacion.motivo}</span>
      </AlertDescription>
    </Alert>
  )
}
