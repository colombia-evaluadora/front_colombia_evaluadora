import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { paths } from "@/config/paths"

import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { Dato } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { abreviarPersona } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"

/** Datos generales: estudiante, acudiente, responsable, y vínculos a las anotaciones y al caso de origen. */
export function DatosProceso({ proceso: p }: { proceso: ProcesoDetalle }) {
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Datos del proceso" contentClassName="flex flex-col gap-4 px-4 py-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Dato label="Estudiante">{p.estudiante.nombre}</Dato>
        <Dato label="Grado/Grupo">{p.estudiante.grado_grupo}</Dato>
        <Dato label="Sede">{p.estudiante.sede_nombre}</Dato>
        <Dato label="Jornada">{p.estudiante.jornada_nombre}</Dato>
        <Dato label="Acudiente">
          {p.acudiente ? (
            <span className="flex flex-wrap items-center gap-2">
              {p.acudiente.nombre}
              {!p.acudiente.tiene_cuenta && (
                <Badge variant="soft" color="warning">
                  Sin cuenta
                </Badge>
              )}
            </span>
          ) : (
            ""
          )}
        </Dato>
        <Dato label="Responsable">{abreviarPersona(p.responsable)}</Dato>
        <Dato label="Abierto por">{abreviarPersona(p.abre)}</Dato>
        <Dato label="Fecha de apertura">{formatFecha(p.fecha_apertura)}</Dato>
      </dl>
      <Dato label="Origen">
        <ul className="flex flex-col gap-1">
          {p.origen.anotaciones.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{formatFecha(a.fecha)}</span>
              <span>
                Anotación <span className="font-semibold">{a.codigo}</span> · {a.codigo_descripcion}
              </span>
              {a.anulada && (
                <Badge variant="soft" color="muted">
                  Anulada
                </Badge>
              )}
            </li>
          ))}
          {p.origen.caso && (
            <li className="flex flex-wrap items-center gap-2">
              <Link to={paths.app.convivenciaCaso.getHref(p.origen.caso.id)} className="underline underline-offset-3">
                Caso {p.origen.caso.numero}
              </Link>
              <span className="text-muted-foreground">· hechos del {formatFecha(p.origen.caso.fecha_hechos)}</span>
            </li>
          )}
        </ul>
      </Dato>
    </SeccionPlegable>
  )
}
