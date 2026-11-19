import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "@/components/ui/icons"

import { formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"

/** Avisos de caso anulado o cerrado, con su motivo o resumen. */
export function AvisosCierre({ caso }: { caso: CasoDetalle }) {
  return (
    <>
      {caso.anulacion && (
        <Alert variant="warning">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            Anulado el {formatFechaHora(caso.anulacion.anulado_en)}
            {caso.anulacion.anulado_por && ` por ${caso.anulacion.anulado_por}`}. Motivo: {caso.anulacion.motivo}
          </AlertDescription>
        </Alert>
      )}
      {caso.cierre && (
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            Cerrado el {formatFechaHora(caso.cierre.cerrado_en)}
            {caso.cierre.cerrado_por && ` por ${caso.cierre.cerrado_por}`}. Resumen: {caso.cierre.resumen}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
