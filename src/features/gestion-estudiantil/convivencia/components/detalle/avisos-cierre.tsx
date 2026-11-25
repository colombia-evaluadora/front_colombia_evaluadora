import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "@/components/ui/icons"

import { formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"

/** Aviso de caso anulado, con su motivo. El cierre va en su propia sección («Cierre del caso»). */
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
    </>
  )
}
