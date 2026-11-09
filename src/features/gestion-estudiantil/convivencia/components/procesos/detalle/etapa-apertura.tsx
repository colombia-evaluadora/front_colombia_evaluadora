import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { Dato } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { EtapaProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-proceso"
import { ListaPruebas } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/lista-pruebas"
import { textoCitacion, textoNotificacion } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"

/** Apertura: cargos, pruebas, comunicación de cargos, plazo para descargos y citación. */
export function EtapaApertura({ proceso }: { proceso: ProcesoDetalle }) {
  const a = proceso.etapas.apertura
  return (
    <EtapaProceso titulo="Apertura" alcanzada={a.alcanzada} resumen={[formatFecha(a.fecha), a.por].filter(Boolean).join(" · ")}>
      <Dato label={`Cargos (${a.cargos.length})`}>
        <ol className="flex flex-col gap-3">
          {a.cargos.map((c) => (
            <li key={c.id} className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
              <span>
                <span className="font-semibold">
                  {c.orden}. {c.codigo}
                </span>{" "}
                · {c.codigo_descripcion} · {c.clasificacion_nombre}
              </span>
              <span className="text-muted-foreground">{c.norma}</span>
              <span className="whitespace-pre-wrap">{c.descripcion}</span>
            </li>
          ))}
        </ol>
      </Dato>
      <ListaPruebas pruebas={a.pruebas} />
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Dato label="Comunicación de cargos">{a.comunicacion ? textoNotificacion(a.comunicacion) : ""}</Dato>
        <Dato label="Plazo para descargos">{formatFecha(a.plazo_descargos)}</Dato>
        <Dato label="Citación a la diligencia">{a.citacion ? textoCitacion(a.citacion) : ""}</Dato>
      </dl>
    </EtapaProceso>
  )
}
