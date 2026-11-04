import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "@/components/ui/icons"

import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { Dato } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"

/** Lo que ve quien reportó un caso Tipo II/III sin acceso a sus datos: número, tipo, estado y fecha. */
export function VistaRestringida({ caso }: { caso: CasoDetalle }) {
  return (
    <>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Dato label="Número">{String(caso.numero)}</Dato>
        <Dato label="Tipo">{caso.tipo_nombre}</Dato>
        <Dato label="Estado">{caso.estado_nombre}</Dato>
        <Dato label="Fecha de conocimiento">{formatFecha(caso.fecha_conocimiento)}</Dato>
      </dl>
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>
          Los datos de un caso {caso.tipo_nombre} son sensibles: como quien lo reportó, solo ve su estado.
        </AlertDescription>
      </Alert>
    </>
  )
}
