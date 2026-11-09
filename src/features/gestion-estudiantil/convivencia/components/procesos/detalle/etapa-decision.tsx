import type { EtapaDecision } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import type { CargoDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { Dato } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { ChipArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/chip-archivo"
import { EtapaProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-proceso"
import { TablaSanciones } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/tabla-sanciones"
import { textoNotificacion } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"

/** Decisión: instancia, resultado, cargos probados, motivación, acto firmado, notificación y sanciones. */
export function EtapaDecisionProceso({ etapa, cargos }: { etapa: EtapaDecision; cargos: CargoDTO[] }) {
  const probados = cargos.filter((c) => etapa.cargos_probados?.includes(c.id)).map((c) => `${c.orden}. ${c.codigo}`)
  return (
    <EtapaProceso titulo="Decisión" alcanzada={etapa.alcanzada} resumen={formatFecha(etapa.fecha)}>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Dato label="Instancia que decide">{etapa.instancia?.nombre ?? ""}</Dato>
        <Dato label="Resultado">{etapa.resultado?.nombre ?? ""}</Dato>
        <Dato label="Cargos probados">{probados.join(", ")}</Dato>
        <Dato label="Plazo para recurrir">{formatFecha(etapa.plazo_recurrir)}</Dato>
      </dl>
      <Dato label="Motivación">
        <span className="whitespace-pre-wrap">{etapa.motivacion}</span>
      </Dato>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Dato label="Acto de decisión firmado">{etapa.acto ? <ChipArchivo archivo={etapa.acto} /> : ""}</Dato>
        <Dato label="Notificación de la decisión">{etapa.notificacion ? textoNotificacion(etapa.notificacion) : ""}</Dato>
      </dl>
      <Dato label="Sanciones">
        <TablaSanciones sanciones={etapa.sanciones ?? []} />
      </Dato>
    </EtapaProceso>
  )
}
