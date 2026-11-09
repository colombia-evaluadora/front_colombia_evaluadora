import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { Dato } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { EtapaProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-proceso"
import { TablaSanciones } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/tabla-sanciones"

/** Firmeza: «En firme desde …» y las sanciones vigentes con su cumplimiento. */
export function EtapaFirmeza({ proceso }: { proceso: ProcesoDetalle }) {
  const e = proceso.etapas.firmeza
  const desde = e.fecha_en_firme ?? proceso.fecha_en_firme
  return (
    <EtapaProceso titulo="Firmeza" alcanzada={e.alcanzada} resumen={desde ? `En firme desde el ${formatFecha(desde)}` : undefined}>
      <Dato label="En firme desde">{formatFecha(desde)}</Dato>
      <Dato label="Sanciones vigentes">
        <TablaSanciones sanciones={e.sanciones} />
      </Dato>
    </EtapaProceso>
  )
}
