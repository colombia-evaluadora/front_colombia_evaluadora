import { FichaDatos } from "@/components/ficha-datos"

import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { EtapaProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-proceso"
import { datoPruebas } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/lista-pruebas"
import { textoCitacion, textoNotificacion } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"

/** Apertura: cargos, pruebas, comunicación de cargos, plazo para descargos y citación. */
export function EtapaApertura({ proceso }: { proceso: ProcesoDetalle }) {
  const a = proceso.etapas.apertura
  return (
    <EtapaProceso titulo="Apertura" alcanzada={a.alcanzada} resumen={[formatFecha(a.fecha), a.por].filter(Boolean).join(" · ")}>
      <FichaDatos
        datos={[
          {
            etiqueta: `Cargos (${a.cargos.length})`,
            ancho: true,
            valor: (
              <ol className="flex w-full flex-col gap-3 py-1">
                {a.cargos.map((c) => (
                  <li key={c.id} className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
                    <span>
                      <span className="font-semibold">
                        {c.orden}. {c.codigo}
                      </span>{" "}
                      · {c.codigo_descripcion} · {c.clasificacion_nombre}
                    </span>
                    <span className="text-muted-foreground">{c.norma}</span>
                    <span className="whitespace-pre-line">{c.descripcion}</span>
                  </li>
                ))}
              </ol>
            ),
          },
          datoPruebas(a.pruebas),
          { etiqueta: "Comunicación de cargos", valor: a.comunicacion ? textoNotificacion(a.comunicacion) : "" },
          { etiqueta: "Plazo para descargos", valor: formatFecha(a.plazo_descargos) },
          { etiqueta: "Citación a la diligencia", valor: a.citacion ? textoCitacion(a.citacion) : "" },
        ]}
      />
    </EtapaProceso>
  )
}
