import { FichaDatos } from "@/components/ficha-datos"

import type { EtapaDecision } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import type { CargoDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { ChipArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/chip-archivo"
import { EtapaProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-proceso"
import { TablaSanciones } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/tabla-sanciones"
import { textoNotificacion } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"

/** Decisión: instancia, resultado, cargos probados, motivación, acto firmado, notificación y sanciones. */
export function EtapaDecisionProceso({ etapa, cargos }: { etapa: EtapaDecision; cargos: CargoDTO[] }) {
  const probados = cargos.filter((c) => etapa.cargos_probados?.includes(c.id)).map((c) => `${c.orden}. ${c.codigo}`)
  return (
    <EtapaProceso titulo="Decisión" alcanzada={etapa.alcanzada} resumen={formatFecha(etapa.fecha)}>
      <FichaDatos
        datos={[
          { etiqueta: "Instancia que decide", valor: etapa.instancia?.nombre ?? "" },
          { etiqueta: "Resultado", valor: etapa.resultado?.nombre ?? "" },
          { etiqueta: "Cargos probados", valor: probados.join(", ") },
          { etiqueta: "Plazo para recurrir", valor: formatFecha(etapa.plazo_recurrir) },
          { etiqueta: "Motivación", valor: <span className="whitespace-pre-line">{etapa.motivacion}</span>, ancho: true },
          { etiqueta: "Acto de decisión firmado", valor: etapa.acto ? <ChipArchivo archivo={etapa.acto} /> : "" },
          { etiqueta: "Notificación de la decisión", valor: etapa.notificacion ? textoNotificacion(etapa.notificacion) : "" },
        ]}
      />
      {/* La tabla de sanciones no cabe en una celda de la ficha: va debajo, con su etiqueta. */}
      <Dato label="Sanciones">
        <TablaSanciones sanciones={etapa.sanciones ?? []} />
      </Dato>
    </EtapaProceso>
  )
}
