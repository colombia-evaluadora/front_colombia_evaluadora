import { FichaDatos } from "@/components/ficha-datos"

import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { EtapaProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-proceso"
import { TablaSanciones } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/tabla-sanciones"

/** Firmeza: «En firme desde …» y las sanciones vigentes con su cumplimiento. */
export function EtapaFirmeza({ proceso }: { proceso: ProcesoDetalle }) {
  const e = proceso.etapas.firmeza
  const desde = e.fecha_en_firme ?? proceso.fecha_en_firme
  return (
    <EtapaProceso titulo="Firmeza" alcanzada={e.alcanzada} resumen={desde ? `En firme desde el ${formatFecha(desde)}` : undefined}>
      <FichaDatos datos={[{ etiqueta: "En firme desde", valor: formatFecha(desde) }]} />
      {/* La tabla de sanciones no cabe en una celda de la ficha: va debajo, con su etiqueta. */}
      <Dato label="Sanciones vigentes">
        <TablaSanciones sanciones={e.sanciones} />
      </Dato>
    </EtapaProceso>
  )
}
