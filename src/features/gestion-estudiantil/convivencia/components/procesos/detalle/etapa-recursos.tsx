import { Badge } from "@/components/ui/badge"

import type { ProcesoDetalle, RecursoDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { Dato } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { ChipArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/chip-archivo"
import { EtapaProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-proceso"
import { TablaSanciones } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/tabla-sanciones"
import { textoNotificacion } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"

/** «Reposición · Pendiente · Presentado el 26/05/2027 por el acudiente · Resuelve: Coordinador». */
const resumenRecurso = (r: RecursoDTO) =>
  [
    r.tipo.nombre,
    r.estado === "PENDIENTE" ? "Pendiente" : "Resuelto",
    `Presentado el ${formatFecha(r.fecha_presentacion)} por ${r.presentado_por.nombre.toLowerCase()}`,
    `Resuelve: ${r.instancia_resuelve.nombre}`,
  ].join(" · ")

function ItemRecurso({ recurso: r }: { recurso: RecursoDTO }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold">{resumenRecurso(r)}</p>
      <Dato label="Argumentos">
        <span className="whitespace-pre-wrap">{r.argumentos}</span>
      </Dato>
      <Dato label="Escrito del recurso">
        <ChipArchivo archivo={r.escrito} />
      </Dato>
      {r.resolucion && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Dato label="Fecha de la resolución">{formatFecha(r.resolucion.fecha)}</Dato>
            <Dato label="Resultado">{r.resolucion.resultado.nombre}</Dato>
            <Dato label="Plazo para recurrir">{formatFecha(r.resolucion.plazo_recurrir)}</Dato>
            <Dato label="Notificación">{textoNotificacion(r.resolucion.notificacion)}</Dato>
          </dl>
          <Dato label="Motivación">
            <span className="whitespace-pre-wrap">{r.resolucion.motivacion}</span>
          </Dato>
          <Dato label="Acto de la resolución">
            <ChipArchivo archivo={r.resolucion.acto} />
          </Dato>
          {r.resolucion.resultado.codigo === "MODIFICA" && r.resolucion.sanciones.length > 0 && (
            <TablaSanciones sanciones={r.resolucion.sanciones} />
          )}
        </div>
      )}
    </li>
  )
}

/** Recursos: cada uno con su escrito y, si se resolvió, la resolución con sus sanciones. */
export function EtapaRecursos({ proceso }: { proceso: ProcesoDetalle }) {
  const e = proceso.etapas.recursos
  return (
    <EtapaProceso
      titulo="Recursos"
      alcanzada={e.alcanzada}
      resumen={
        e.por_resolver > 0 ? (
          <Badge variant="soft" color="warning">
            {e.por_resolver} por resolver
          </Badge>
        ) : (
          `${e.items.length} presentado${e.items.length === 1 ? "" : "s"}`
        )
      }
    >
      {e.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No se presentaron recursos.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {e.items.map((r) => (
            <ItemRecurso key={r.id} recurso={r} />
          ))}
        </ul>
      )}
    </EtapaProceso>
  )
}
