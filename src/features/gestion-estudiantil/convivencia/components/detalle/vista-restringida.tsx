import { FichaDatos } from "@/components/ficha-datos"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "@/components/ui/icons"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"

/** Lo que ve quien reportó un caso Tipo II/III sin acceso a sus datos: número, tipo, estado y fecha. */
export function VistaRestringida({ caso }: { caso: CasoDetalle }) {
  return (
    <>
      <FichaDatos
        datos={[
          { etiqueta: "Número", valor: String(caso.numero) },
          { etiqueta: "Tipo", valor: caso.tipo_nombre },
          { etiqueta: "Estado", valor: caso.estado_nombre },
          { etiqueta: "Fecha de conocimiento", valor: formatFecha(caso.fecha_conocimiento) },
        ]}
      />
      <Alert variant="info">
        <InfoIcon aria-hidden="true" />
        <AlertDescription>
          Los datos de un caso {caso.tipo_nombre} son sensibles: como quien lo reportó, solo ve su estado.
        </AlertDescription>
      </Alert>
    </>
  )
}
