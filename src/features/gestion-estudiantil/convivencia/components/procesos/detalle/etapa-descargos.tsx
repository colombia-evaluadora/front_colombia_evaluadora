import type { EtapaDescargos } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { Dato } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { ChipArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/chip-archivo"
import { EtapaProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-proceso"
import { ListaPruebas } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/lista-pruebas"

const siNo = (v: boolean | null | undefined) => (v == null ? "" : v ? "Sí" : "No")

/** Descargos: si el estudiante los presentó (versión, acta, pruebas) o la constancia de que no. */
export function EtapaDescargosProceso({ etapa }: { etapa: EtapaDescargos }) {
  return (
    <EtapaProceso titulo="Descargos" alcanzada={etapa.alcanzada} resumen={formatFecha(etapa.fecha)}>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Dato label="Presentó descargos">{siNo(etapa.presento)}</Dato>
        {etapa.presento && <Dato label="Fecha de la diligencia">{formatFecha(etapa.fecha_diligencia)}</Dato>}
        {etapa.presento && <Dato label="Acudiente presente">{siNo(etapa.acudiente_presente)}</Dato>}
        <Dato label="Registrado por">{etapa.registrado_por ?? ""}</Dato>
      </dl>
      {etapa.presento ? (
        <>
          <Dato label="Versión del estudiante">
            <span className="whitespace-pre-wrap">{etapa.version}</span>
          </Dato>
          <Dato label="Otros asistentes">{etapa.otros_asistentes ?? ""}</Dato>
          <ListaPruebas pruebas={etapa.pruebas} />
          <Dato label="Acta de descargos firmada">{etapa.acta ? <ChipArchivo archivo={etapa.acta} /> : ""}</Dato>
        </>
      ) : (
        <Dato label="Constancia">
          <span className="whitespace-pre-wrap">{etapa.constancia}</span>
        </Dato>
      )}
    </EtapaProceso>
  )
}
