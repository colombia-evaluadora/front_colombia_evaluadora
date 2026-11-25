import { FichaDatos } from "@/components/ficha-datos"
import { Badge } from "@/components/ui/badge"

import type { ProcesoDetalle, RecursoDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
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
      <FichaDatos
        datos={[
          { etiqueta: "Argumentos", valor: <span className="whitespace-pre-line">{r.argumentos}</span>, ancho: true },
          { etiqueta: "Escrito del recurso", valor: <ChipArchivo archivo={r.escrito} /> },
        ]}
      />
      {r.resolucion && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <FichaDatos
            datos={[
              { etiqueta: "Fecha de la resolución", valor: formatFecha(r.resolucion.fecha) },
              { etiqueta: "Resultado", valor: r.resolucion.resultado.nombre },
              { etiqueta: "Plazo para recurrir", valor: formatFecha(r.resolucion.plazo_recurrir) },
              { etiqueta: "Notificación", valor: textoNotificacion(r.resolucion.notificacion) },
              { etiqueta: "Motivación", valor: <span className="whitespace-pre-line">{r.resolucion.motivacion}</span>, ancho: true },
              { etiqueta: "Acto de la resolución", valor: <ChipArchivo archivo={r.resolucion.acto} /> },
            ]}
          />
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
