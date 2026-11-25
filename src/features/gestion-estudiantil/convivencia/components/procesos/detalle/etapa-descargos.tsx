import { FichaDatos } from "@/components/ficha-datos"

import type { EtapaDescargos } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { ChipArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/chip-archivo"
import { EtapaProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-proceso"
import { datoPruebas } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/lista-pruebas"

const siNo = (v: boolean | null | undefined) => (v == null ? "" : v ? "Sí" : "No")

/** Descargos: si el estudiante los presentó (versión, acta, pruebas) o la constancia de que no. */
export function EtapaDescargosProceso({ etapa }: { etapa: EtapaDescargos }) {
  return (
    <EtapaProceso titulo="Descargos" alcanzada={etapa.alcanzada} resumen={formatFecha(etapa.fecha)}>
      <FichaDatos
        datos={[
          { etiqueta: "Presentó descargos", valor: siNo(etapa.presento) },
          ...(etapa.presento
            ? [
                { etiqueta: "Fecha de la diligencia", valor: formatFecha(etapa.fecha_diligencia) },
                { etiqueta: "Acudiente presente", valor: siNo(etapa.acudiente_presente) },
              ]
            : []),
          { etiqueta: "Registrado por", valor: etapa.registrado_por ?? "" },
          ...(etapa.presento
            ? [
                { etiqueta: "Versión del estudiante", valor: <span className="whitespace-pre-line">{etapa.version}</span>, ancho: true },
                { etiqueta: "Otros asistentes", valor: etapa.otros_asistentes ?? "", ancho: true },
                datoPruebas(etapa.pruebas),
                { etiqueta: "Acta de descargos firmada", valor: etapa.acta ? <ChipArchivo archivo={etapa.acta} /> : "" },
              ]
            : [{ etiqueta: "Constancia", valor: <span className="whitespace-pre-line">{etapa.constancia}</span>, ancho: true }]),
        ]}
      />
    </EtapaProceso>
  )
}
